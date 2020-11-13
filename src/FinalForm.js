// @flow
import getIn from './structure/getIn'
import setIn from './structure/setIn'
import publishFieldState from './publishFieldState'
import filterFieldState from './filterFieldState'
import filterFormState from './filterFormState'
import memoize from './memoize'
import isPromise from './isPromise'
import shallowEqual from './shallowEqual'
import type {
  ChangeValue,
  Config,
  ConfigKey,
  FieldConfig,
  FieldState,
  FieldSubscriber,
  FieldSubscription,
  FormApi,
  FormState,
  FormSubscriber,
  FormSubscription,
  FormValuesShape,
  InternalFieldState,
  InternalFormState,
  IsEqual,
  MutableState,
  RenameField,
  Subscriber,
  Subscribers,
  Subscription,
  Unsubscribe
} from './types'
import { FORM_ERROR, ARRAY_ERROR } from './constants'
export { version } from '../package.json'

export const configOptions: ConfigKey[] = [
  'debug',
  'initialValues',
  'keepDirtyOnReinitialize',
  'mutators',
  'onSubmit',
  'validate',
  'validateOnBlur'
]

const tripleEquals: IsEqual = (a: any, b: any): boolean => a === b

type InternalState<FormValues> = {
  subscribers: Subscribers<FormState<FormValues>>,
  lastFormState?: FormState<FormValues>,
  fields: {
    [string]: InternalFieldState
  },
  fieldSubscribers: { [string]: Subscribers<FieldState> },
  formState: InternalFormState<FormValues>
} & MutableState<FormValues>

export type StateFilter<T> = (
  state: T,
  previousState: ?T,
  subscription: Subscription,
  force: boolean
) => ?T

const hasAnyError = (errors: Object): boolean => {
  return Object.keys(errors).some((key) => {
    const value = errors[key]

    if (value && typeof value === 'object' && !(value instanceof Error)) {
      return hasAnyError(value)
    }

    return typeof value !== 'undefined'
  })
}

function convertToExternalFormState<FormValues: FormValuesShape>({
  // kind of silly, but it ensures type safety ¯\_(ツ)_/¯
  active,
  dirtySinceLastSubmit,
  modifiedSinceLastSubmit,
  error,
  errors,
  initialValues,
  pristine,
  submitting,
  submitFailed,
  submitSucceeded,
  submitError,
  submitErrors,
  valid,
  validating,
  values
}: InternalFormState<FormValues>): FormState<FormValues> {
  return {
    active,
    dirty: !pristine,
    dirtySinceLastSubmit,
    modifiedSinceLastSubmit,
    error,
    errors,
    hasSubmitErrors: !!(
      submitError ||
      (submitErrors && hasAnyError(submitErrors))
    ),
    hasValidationErrors: !!(error || hasAnyError(errors)),
    invalid: !valid,
    initialValues,
    pristine,
    submitting,
    submitFailed,
    submitSucceeded,
    submitError,
    submitErrors,
    valid,
    validating: validating > 0,
    values
  }
}

function notifySubscriber<T: Object>(
  subscriber: Subscriber<T>,
  subscription: Subscription,
  state: T,
  lastState: ?T,
  filter: StateFilter<T>,
  force
): boolean {
  const notification: ?T = filter(state, lastState, subscription, force)
  if (notification) {
    subscriber(notification)
    return true
  }
  return false
}

function notify<T: Object>(
  { entries }: Subscribers<T>,
  state: T,
  lastState: ?T,
  filter: StateFilter<T>,
  force?: boolean
): void {
  Object.keys(entries).forEach((key) => {
    const entry = entries[Number(key)]
    // istanbul ignore next
    if (entry) {
      const { subscription, subscriber, notified } = entry
      if (
        notifySubscriber(
          subscriber,
          subscription,
          state,
          lastState,
          filter,
          force || !notified
        )
      ) {
        entry.notified = true
      }
    }
  })
}

function createForm<FormValues: FormValuesShape>(
  config: Config<FormValues>
): FormApi<FormValues> {
  if (!config) {
    throw new Error('No config specified')
  }
  let {
    debug,
    destroyOnUnregister,
    keepDirtyOnReinitialize,
    initialValues,
    mutators,
    onSubmit,
    validate,
    validateOnBlur
  } = config
  if (!onSubmit) {
    throw new Error('No onSubmit function specified')
  }

  const state: InternalState<FormValues> = {
    subscribers: { index: 0, entries: {} },
    fieldSubscribers: {},
    fields: {},
    formState: {
      dirtySinceLastSubmit: false,
      modifiedSinceLastSubmit: false,
      errors: {},
      initialValues: initialValues && { ...initialValues },
      invalid: false,
      pristine: true,
      submitting: false,
      submitFailed: false,
      submitSucceeded: false,
      resetWhileSubmitting: false,
      valid: true,
      validating: 0,
      values: initialValues ? { ...initialValues } : (({}: any): FormValues)
    },
    lastFormState: undefined
  }
  let inBatch = 0
  let validationPaused = false
  let validationBlocked = false
  let preventNotificationWhileValidationPaused = false
  let nextAsyncValidationKey = 0
  const asyncValidationPromises: { [number]: Promise<*> } = {}
  const clearAsyncValidationPromise = (key) => (result) => {
    delete asyncValidationPromises[key]
    return result
  }

  const changeValue: ChangeValue<FormValues> = (state, name, mutate) => {
    const before = getIn(state.formState.values, name)
    const after = mutate(before)
    state.formState.values = setIn(state.formState.values, name, after) || {}
  }
  const renameField: RenameField<FormValues> = (state, from, to) => {
    if (state.fields[from]) {
      state.fields = {
        ...state.fields,
        [to]: {
          ...state.fields[from],
          name: to,
          // rebind event handlers
          blur: () => api.blur(to),
          change: (value) => api.change(to, value),
          focus: () => api.focus(to),
          lastFieldState: undefined
        }
      }
      delete state.fields[from]
      state.fieldSubscribers = {
        ...state.fieldSubscribers,
        [to]: state.fieldSubscribers[from]
      }
      delete state.fieldSubscribers[from]
      const value = getIn(state.formState.values, from)
      state.formState.values =
        setIn(state.formState.values, from, undefined) || {}
      state.formState.values = setIn(state.formState.values, to, value)
      delete state.lastFormState
    }
  }

  // bind state to mutators
  const getMutatorApi = (key) => (...args) => {
    // istanbul ignore next
    if (mutators) {
      // ^^ causes branch coverage warning, but needed to appease the Flow gods
      const mutatableState: MutableState<FormValues> = {
        formState: state.formState,
        fields: state.fields,
        fieldSubscribers: state.fieldSubscribers,
        lastFormState: state.lastFormState
      }
      const returnValue = mutators[key](args, mutatableState, {
        changeValue,
        getIn,
        renameField,
        resetFieldState: api.resetFieldState,
        setIn,
        shallowEqual
      })
      state.formState = mutatableState.formState
      state.fields = mutatableState.fields
      state.fieldSubscribers = mutatableState.fieldSubscribers
      state.lastFormState = mutatableState.lastFormState
      runValidation(undefined, () => {
        notifyFieldListeners()
        notifyFormListeners()
      })
      return returnValue
    }
  }

  const mutatorsApi = mutators
    ? Object.keys(mutators).reduce((result, key) => {
        result[key] = getMutatorApi(key)
        return result
      }, {})
    : {}

  const runRecordLevelValidation = (
    setErrors: (errors: Object) => void
  ): Promise<*>[] => {
    const promises = []
    if (validate) {
      const errorsOrPromise = validate({ ...state.formState.values }) // clone to avoid writing
      if (isPromise(errorsOrPromise)) {
        promises.push(errorsOrPromise.then(setErrors))
      } else {
        setErrors(errorsOrPromise)
      }
    }
    return promises
  }

  const getValidators = (field: InternalFieldState) =>
    Object.keys(field.validators).reduce((result, index) => {
      const validator = field.validators[Number(index)]()
      if (validator) {
        result.push(validator)
      }
      return result
    }, [])

  const runFieldLevelValidation = (
    name: string,
    setError: (error: ?any) => void
  ): Promise<*>[] => {
    const promises = []
    const validators = getValidators(state.fields[name])
    if (validators.length) {
      let error
      validators.forEach((validator) => {
        const errorOrPromise = validator(
          getIn(state.formState.values, name),
          state.formState.values,
          validator.length === 0 || validator.length === 3
            ? publishFieldState(state.formState, state.fields[name])
            : undefined
        )

        if (errorOrPromise && isPromise(errorOrPromise)) {
          state.fields[name].validating = true
          const promise = errorOrPromise.then((error) => {
            state.fields[name].validating = false
            setError(error)
          }) // errors must be resolved, not rejected
          promises.push(promise)
        } else if (!error) {
          // first registered validator wins
          error = errorOrPromise
        }
      })
      setError(error)
    }
    return promises
  }

  const runValidation = (fieldChanged: ?string, callback: () => void) => {
    if (validationPaused) {
      validationBlocked = true
      callback()
      return
    }

    const { fields, formState } = state
    const safeFields = { ...fields }
    let fieldKeys = Object.keys(safeFields)
    if (
      !validate &&
      !fieldKeys.some((key) => getValidators(safeFields[key]).length)
    ) {
      callback()
      return // no validation rules
    }

    // pare down field keys to actually validate
    let limitedFieldLevelValidation = false
    if (fieldChanged) {
      const changedField = safeFields[fieldChanged]
      if (changedField) {
        const { validateFields } = changedField
        if (validateFields) {
          limitedFieldLevelValidation = true
          fieldKeys = validateFields.length
            ? validateFields.concat(fieldChanged)
            : [fieldChanged]
        }
      }
    }

    let recordLevelErrors: Object = {}
    const fieldLevelErrors = {}

    const promises = [
      ...runRecordLevelValidation((errors) => {
        recordLevelErrors = errors || {}
      }),
      ...fieldKeys.reduce(
        (result, name) =>
          result.concat(
            runFieldLevelValidation(name, (error: ?any) => {
              fieldLevelErrors[name] = error
            })
          ),
        []
      )
    ]

    const hasAsyncValidations = promises.length > 0
    const asyncValidationPromiseKey = ++nextAsyncValidationKey
    const promise = Promise.all(promises).then(
      clearAsyncValidationPromise(asyncValidationPromiseKey)
    )

    // backwards-compat: add promise to submit-blocking promises iff there are any promises to await
    if (hasAsyncValidations) {
      asyncValidationPromises[asyncValidationPromiseKey] = promise
    }

    const processErrors = () => {
      let merged = {
        ...(limitedFieldLevelValidation ? formState.errors : {}),
        ...recordLevelErrors
      }
      const forEachError = (fn: (name: string, error: any) => void) => {
        fieldKeys.forEach((name) => {
          if (fields[name]) {
            // make sure field is still registered
            // field-level errors take precedent over record-level errors
            const recordLevelError = getIn(recordLevelErrors, name)
            const errorFromParent = getIn(merged, name)
            const hasFieldLevelValidation = getValidators(safeFields[name])
              .length
            const fieldLevelError = fieldLevelErrors[name]
            fn(
              name,
              (hasFieldLevelValidation && fieldLevelError) ||
                (validate && recordLevelError) ||
                (!recordLevelError && !limitedFieldLevelValidation
                  ? errorFromParent
                  : undefined)
            )
          }
        })
      }
      forEachError((name, error) => {
        merged = setIn(merged, name, error) || {}
      })
      forEachError((name, error) => {
        if (error && error[ARRAY_ERROR]) {
          const existing = getIn(merged, name)
          const copy: any = [...existing]
          copy[ARRAY_ERROR] = error[ARRAY_ERROR]
          merged = setIn(merged, name, copy)
        }
      })
      if (!shallowEqual(formState.errors, merged)) {
        formState.errors = merged
      }
      formState.error = recordLevelErrors[FORM_ERROR]
    }

    // process sync errors
    processErrors()
    // sync errors have been set. notify listeners while we wait for others
    callback()

    if (hasAsyncValidations) {
      state.formState.validating++
      callback()

      const afterPromise = () => {
        state.formState.validating--
        callback()
      }

      promise
        .then(() => {
          if (nextAsyncValidationKey > asyncValidationPromiseKey) {
            // if this async validator has been superseded by another, ignore its results
            return
          }

          processErrors()
        })
        .then(afterPromise, afterPromise)
    }
  }

  const notifyFieldListeners = (name: ?string) => {
    if (inBatch) {
      return
    }
    const { fields, fieldSubscribers, formState } = state
    const safeFields = { ...fields }
    const notifyField = (name: string) => {
      const field = safeFields[name]
      const fieldState = publishFieldState(formState, field)
      const { lastFieldState } = field
      field.lastFieldState = fieldState
      const fieldSubscriber = fieldSubscribers[name]
      if (fieldSubscriber) {
        notify(
          fieldSubscriber,
          fieldState,
          lastFieldState,
          filterFieldState,
          lastFieldState === undefined
        )
      }
    }
    if (name) {
      notifyField(name)
    } else {
      Object.keys(safeFields).forEach(notifyField)
    }
  }

  const markAllFieldsTouched = (): void => {
    Object.keys(state.fields).forEach((key) => {
      state.fields[key].touched = true
    })
  }

  const hasSyncErrors = () =>
    !!(state.formState.error || hasAnyError(state.formState.errors))

  const calculateNextFormState = (): FormState<FormValues> => {
    const { fields, formState, lastFormState } = state
    const safeFields = { ...fields }
    const safeFieldKeys = Object.keys(safeFields)

    // calculate dirty/pristine
    let foundDirty = false
    const dirtyFields = safeFieldKeys.reduce((result, key) => {
      const dirty = !safeFields[key].isEqual(
        getIn(formState.values, key),
        getIn(formState.initialValues || {}, key)
      )
      if (dirty) {
        foundDirty = true
        result[key] = true
      }
      return result
    }, {})
    const dirtyFieldsSinceLastSubmit = safeFieldKeys.reduce((result, key) => {
      // istanbul ignore next
      const nonNullLastSubmittedValues = formState.lastSubmittedValues || {} // || {} is for flow, but causes branch coverage complaint
      if (
        !safeFields[key].isEqual(
          getIn(formState.values, key),
          getIn(nonNullLastSubmittedValues, key)
        )
      ) {
        result[key] = true
      }
      return result
    }, {})
    formState.pristine = !foundDirty
    formState.dirtySinceLastSubmit = !!(
      formState.lastSubmittedValues &&
      Object.values(dirtyFieldsSinceLastSubmit).some((value) => value)
    )
    formState.modifiedSinceLastSubmit = !!(
      formState.lastSubmittedValues &&
      // Object.values would treat values as mixed (facebook/flow#2221)
      Object.keys(safeFields).some(
        (value) => safeFields[value].modifiedSinceLastSubmit
      )
    )

    formState.valid =
      !formState.error &&
      !formState.submitError &&
      !hasAnyError(formState.errors) &&
      !(formState.submitErrors && hasAnyError(formState.submitErrors))
    const nextFormState = convertToExternalFormState(formState)
    const { modified, touched, visited } = safeFieldKeys.reduce(
      (result, key) => {
        result.modified[key] = safeFields[key].modified
        result.touched[key] = safeFields[key].touched
        result.visited[key] = safeFields[key].visited
        return result
      },
      { modified: {}, touched: {}, visited: {} }
    )
    nextFormState.dirtyFields =
      lastFormState && shallowEqual(lastFormState.dirtyFields, dirtyFields)
        ? lastFormState.dirtyFields
        : dirtyFields
    nextFormState.dirtyFieldsSinceLastSubmit =
      lastFormState &&
      shallowEqual(
        lastFormState.dirtyFieldsSinceLastSubmit,
        dirtyFieldsSinceLastSubmit
      )
        ? lastFormState.dirtyFieldsSinceLastSubmit
        : dirtyFieldsSinceLastSubmit
    nextFormState.modified =
      lastFormState && shallowEqual(lastFormState.modified, modified)
        ? lastFormState.modified
        : modified
    nextFormState.touched =
      lastFormState && shallowEqual(lastFormState.touched, touched)
        ? lastFormState.touched
        : touched
    nextFormState.visited =
      lastFormState && shallowEqual(lastFormState.visited, visited)
        ? lastFormState.visited
        : visited
    return lastFormState && shallowEqual(lastFormState, nextFormState)
      ? lastFormState
      : nextFormState
  }

  const callDebug = () =>
    debug &&
    process.env.NODE_ENV !== 'production' &&
    debug(
      calculateNextFormState(),
      Object.keys(state.fields).reduce((result, key: string) => {
        result[key] = state.fields[key]
        return result
      }, {})
    )

  let notifying: boolean = false
  let scheduleNotification: boolean = false
  const notifyFormListeners = () => {
    if (notifying) {
      scheduleNotification = true
    } else {
      notifying = true
      callDebug()
      if (
        !inBatch &&
        !(validationPaused && preventNotificationWhileValidationPaused)
      ) {
        const { lastFormState } = state
        const nextFormState = calculateNextFormState()
        if (nextFormState !== lastFormState) {
          state.lastFormState = nextFormState
          notify(
            state.subscribers,
            nextFormState,
            lastFormState,
            filterFormState
          )
        }
      }
      notifying = false
      if (scheduleNotification) {
        scheduleNotification = false
        notifyFormListeners()
      }
    }
  }

  const beforeSubmit = (): boolean =>
    Object.keys(state.fields).some(
      (name) =>
        state.fields[name].beforeSubmit &&
        state.fields[name].beforeSubmit() === false
    )

  const afterSubmit = (): void =>
    Object.keys(state.fields).forEach(
      (name) =>
        state.fields[name].afterSubmit && state.fields[name].afterSubmit()
    )

  const resetModifiedAfterSubmit = (): void =>
    Object.keys(state.fields).forEach(
      (key) => (state.fields[key].modifiedSinceLastSubmit = false)
    )

  // generate initial errors
  runValidation(undefined, () => {
    notifyFormListeners()
  })

  const api: FormApi<FormValues> = {
    batch: (fn: () => void) => {
      inBatch++
      fn()
      inBatch--
      notifyFieldListeners()
      notifyFormListeners()
    },

    blur: (name: string) => {
      const { fields, formState } = state
      const previous = fields[name]
      if (previous) {
        // can only blur registered fields
        delete formState.active
        fields[name] = {
          ...previous,
          active: false,
          touched: true
        }
        if (validateOnBlur) {
          runValidation(name, () => {
            notifyFieldListeners()
            notifyFormListeners()
          })
        } else {
          notifyFieldListeners()
          notifyFormListeners()
        }
      }
    },

    change: (name: string, value: ?any) => {
      const { fields, formState } = state
      if (getIn(formState.values, name) !== value) {
        changeValue(state, name, () => value)
        const previous = fields[name]
        if (previous) {
          // only track modified for registered fields
          fields[name] = {
            ...previous,
            modified: true,
            modifiedSinceLastSubmit: !!formState.lastSubmittedValues
          }
        }
        if (validateOnBlur) {
          notifyFieldListeners()
          notifyFormListeners()
        } else {
          runValidation(name, () => {
            notifyFieldListeners()
            notifyFormListeners()
          })
        }
      }
    },

    get destroyOnUnregister() {
      return !!destroyOnUnregister
    },

    set destroyOnUnregister(value: boolean) {
      destroyOnUnregister = value
    },

    focus: (name: string) => {
      const field = state.fields[name]
      if (field && !field.active) {
        state.formState.active = name
        field.active = true
        field.visited = true
        notifyFieldListeners()
        notifyFormListeners()
      }
    },

    mutators: mutatorsApi,

    getFieldState: (name) => {
      const field = state.fields[name]
      return field && field.lastFieldState
    },

    getRegisteredFields: () => Object.keys(state.fields),

    getState: () => calculateNextFormState(),

    initialize: (data: Object | ((values: Object) => Object)) => {
      const { fields, formState } = state
      const safeFields = { ...fields }
      const values = typeof data === 'function' ? data(formState.values) : data
      if (!keepDirtyOnReinitialize) {
        formState.values = values
      }
      /**
       * Hello, inquisitive code reader! Thanks for taking the time to dig in!
       *
       * The following code is the way it is to allow for non-registered deep
       * field values to be set via initialize()
       */

      // save dirty values
      const savedDirtyValues = keepDirtyOnReinitialize
        ? Object.keys(safeFields).reduce((result, key) => {
            const field = safeFields[key]
            const pristine = field.isEqual(
              getIn(formState.values, key),
              getIn(formState.initialValues || {}, key)
            )
            if (!pristine) {
              result[key] = getIn(formState.values, key)
            }
            return result
          }, {})
        : {}
      // update initalValues and values
      formState.initialValues = values
      formState.values = values
      // restore the dirty values
      Object.keys(savedDirtyValues).forEach((key) => {
        formState.values = setIn(formState.values, key, savedDirtyValues[key])
      })
      runValidation(undefined, () => {
        notifyFieldListeners()
        notifyFormListeners()
      })
    },

    isValidationPaused: () => validationPaused,

    pauseValidation: (preventNotification: boolean = true) => {
      validationPaused = true
      preventNotificationWhileValidationPaused = preventNotification
    },

    registerField: (
      name: string,
      subscriber: FieldSubscriber,
      subscription: FieldSubscription = {},
      fieldConfig?: FieldConfig
    ): Unsubscribe => {
      if (!state.fieldSubscribers[name]) {
        state.fieldSubscribers[name] = { index: 0, entries: {} }
      }
      const index = state.fieldSubscribers[name].index++

      // save field subscriber callback
      state.fieldSubscribers[name].entries[index] = {
        subscriber: memoize(subscriber),
        subscription,
        notified: false
      }

      // create initial field state if not exists
      const field = state.fields[name] || {
        active: false,
        afterSubmit: fieldConfig && fieldConfig.afterSubmit,
        beforeSubmit: fieldConfig && fieldConfig.beforeSubmit,
        data: (fieldConfig && fieldConfig.data) || {},
        isEqual: (fieldConfig && fieldConfig.isEqual) || tripleEquals,
        lastFieldState: undefined,
        modified: false,
        modifiedSinceLastSubmit: false,
        name,
        touched: false,
        valid: true,
        validateFields: fieldConfig && fieldConfig.validateFields,
        validators: {},
        validating: false,
        visited: false
      }

      // Mutators can create a field in order to keep the field states
      // We must update this field when registerField is called afterwards
      field.blur = field.blur || (() => api.blur(name))
      field.change = field.change || ((value) => api.change(name, value))
      field.focus = field.focus || (() => api.focus(name))

      state.fields[name] = field

      let haveValidator = false
      const silent = fieldConfig && fieldConfig.silent
      const notify = () => {
        if (silent) {
          notifyFieldListeners(name)
        } else {
          notifyFormListeners()
          notifyFieldListeners()
        }
      }
      if (fieldConfig) {
        haveValidator = !!(
          fieldConfig.getValidator && fieldConfig.getValidator()
        )
        if (fieldConfig.getValidator) {
          field.validators[index] = fieldConfig.getValidator
        }

        const noValueInFormState =
          getIn(state.formState.values, name) === undefined
        if (
          fieldConfig.initialValue !== undefined &&
          noValueInFormState &&
          (getIn(state.formState.values, name) === undefined ||
            getIn(state.formState.values, name) ===
              getIn(state.formState.initialValues, name))
          // only initialize if we don't yet have any value for this field
        ) {
          state.formState.initialValues = setIn(
            state.formState.initialValues || {},
            name,
            fieldConfig.initialValue
          )
          state.formState.values = setIn(
            state.formState.values,
            name,
            fieldConfig.initialValue
          )
          runValidation(undefined, notify)
        }

        // only use defaultValue if we don't yet have any value for this field
        if (
          fieldConfig.defaultValue !== undefined &&
          fieldConfig.initialValue === undefined &&
          getIn(state.formState.initialValues, name) === undefined &&
          noValueInFormState
        ) {
          state.formState.values = setIn(
            state.formState.values,
            name,
            fieldConfig.defaultValue
          )
        }
      }

      if (haveValidator) {
        runValidation(undefined, notify)
      } else {
        notify()
      }

      return () => {
        let validatorRemoved = false
        // istanbul ignore next
        if (state.fields[name]) {
          // state.fields[name] may have been removed by a mutator
          validatorRemoved = !!(
            state.fields[name].validators[index] &&
            state.fields[name].validators[index]()
          )
          delete state.fields[name].validators[index]
        }
        let hasFieldSubscribers = !!state.fieldSubscribers[name]
        if (hasFieldSubscribers) {
          // state.fieldSubscribers[name] may have been removed by a mutator
          delete state.fieldSubscribers[name].entries[index]
        }
        let lastOne =
          hasFieldSubscribers &&
          !Object.keys(state.fieldSubscribers[name].entries).length
        if (lastOne) {
          delete state.fieldSubscribers[name]
          delete state.fields[name]
          if (validatorRemoved) {
            state.formState.errors =
              setIn(state.formState.errors, name, undefined) || {}
          }
          if (destroyOnUnregister) {
            state.formState.values =
              setIn(state.formState.values, name, undefined, true) || {}
          }
        }
        if (!silent) {
          if (validatorRemoved) {
            runValidation(undefined, () => {
              notifyFormListeners()
              notifyFieldListeners()
            })
          } else if (lastOne) {
            // values or errors may have changed
            notifyFormListeners()
          }
        }
      }
    },

    reset: (initialValues = state.formState.initialValues) => {
      if (state.formState.submitting) {
        state.formState.resetWhileSubmitting = true
      }
      state.formState.submitFailed = false
      state.formState.submitSucceeded = false
      delete state.formState.submitError
      delete state.formState.submitErrors
      delete state.formState.lastSubmittedValues
      api.initialize(initialValues || {})
    },

    /**
     * Resets all field flags (e.g. touched, visited, etc.) to their initial state
     */
    resetFieldState: (name: string) => {
      state.fields[name] = {
        ...state.fields[name],
        ...{
          active: false,
          lastFieldState: undefined,
          modified: false,
          touched: false,
          valid: true,
          validating: false,
          visited: false
        }
      }
      runValidation(undefined, () => {
        notifyFieldListeners()
        notifyFormListeners()
      })
    },

    /**
     * Returns the form to a clean slate; that is:
     * - Clear all values
     * - Resets all fields to their initial state
     */
    restart: (initialValues = state.formState.initialValues) => {
      api.batch(() => {
        for (const name in state.fields) {
          api.resetFieldState(name)
          state.fields[name] = {
            ...state.fields[name],
            ...{
              active: false,
              lastFieldState: undefined,
              modified: false,
              modifiedSinceLastSubmit: false,
              touched: false,
              valid: true,
              validating: false,
              visited: false
            }
          }
        }
        api.reset(initialValues)
      })
    },

    resumeValidation: () => {
      validationPaused = false
      preventNotificationWhileValidationPaused = false
      if (validationBlocked) {
        // validation was attempted while it was paused, so run it now
        runValidation(undefined, () => {
          notifyFieldListeners()
          notifyFormListeners()
        })
      }
      validationBlocked = false
    },

    setConfig: (name: string, value: any): void => {
      switch (name) {
        case 'debug':
          debug = value
          break
        case 'destroyOnUnregister':
          destroyOnUnregister = value
          break
        case 'initialValues':
          api.initialize(value)
          break
        case 'keepDirtyOnReinitialize':
          keepDirtyOnReinitialize = value
          break
        case 'mutators':
          mutators = value
          if (value) {
            Object.keys(mutatorsApi).forEach((key) => {
              if (!(key in value)) {
                delete mutatorsApi[key]
              }
            })
            Object.keys(value).forEach((key) => {
              mutatorsApi[key] = getMutatorApi(key)
            })
          } else {
            Object.keys(mutatorsApi).forEach((key) => {
              delete mutatorsApi[key]
            })
          }
          break
        case 'onSubmit':
          onSubmit = value
          break
        case 'validate':
          validate = value
          runValidation(undefined, () => {
            notifyFieldListeners()
            notifyFormListeners()
          })
          break
        case 'validateOnBlur':
          validateOnBlur = value
          break
        default:
          throw new Error('Unrecognised option ' + name)
      }
    },

    submit: () => {
      const { formState } = state

      if (formState.submitting) {
        return
      }

      delete formState.submitErrors
      delete formState.submitError
      formState.lastSubmittedValues = { ...formState.values }

      if (hasSyncErrors()) {
        markAllFieldsTouched()
        state.formState.submitFailed = true
        notifyFormListeners()
        notifyFieldListeners()
        return // no submit for you!!
      }
      const asyncValidationPromisesKeys = Object.keys(asyncValidationPromises)
      if (asyncValidationPromisesKeys.length) {
        // still waiting on async validation to complete...
        Promise.all(
          asyncValidationPromisesKeys.map(
            (key) => asyncValidationPromises[Number(key)]
          )
        ).then(api.submit, console.error)
        return
      }
      const submitIsBlocked = beforeSubmit()
      if (submitIsBlocked) {
        return
      }

      let resolvePromise
      let completeCalled = false
      const complete = (errors: ?Object) => {
        formState.submitting = false
        const { resetWhileSubmitting } = formState
        if (resetWhileSubmitting) {
          formState.resetWhileSubmitting = false
        }
        if (errors && hasAnyError(errors)) {
          formState.submitFailed = true
          formState.submitSucceeded = false
          formState.submitErrors = errors
          formState.submitError = errors[FORM_ERROR]
          markAllFieldsTouched()
        } else {
          if (!resetWhileSubmitting) {
            formState.submitFailed = false
            formState.submitSucceeded = true
          }
          afterSubmit()
        }
        notifyFormListeners()
        notifyFieldListeners()
        completeCalled = true
        if (resolvePromise) {
          resolvePromise(errors)
        }
        return errors
      }

      formState.submitting = true
      formState.submitFailed = false
      formState.submitSucceeded = false
      formState.lastSubmittedValues = { ...formState.values }
      resetModifiedAfterSubmit()

      // onSubmit is either sync, callback or async with a Promise
      const result = onSubmit(formState.values, api, complete)

      if (!completeCalled) {
        if (result && isPromise(result)) {
          // onSubmit is async with a Promise
          notifyFormListeners() // let everyone know we are submitting
          notifyFieldListeners() // notify fields also
          return result.then(complete, (error) => {
            complete()
            throw error
          })
        } else if (onSubmit.length >= 3) {
          // must be async, so we should return a Promise
          notifyFormListeners() // let everyone know we are submitting
          notifyFieldListeners() // notify fields also
          return new Promise((resolve) => {
            resolvePromise = resolve
          })
        } else {
          // onSubmit is sync
          complete(result)
        }
      }
    },

    subscribe: (
      subscriber: FormSubscriber<FormValues>,
      subscription: FormSubscription
    ): Unsubscribe => {
      if (!subscriber) {
        throw new Error('No callback given.')
      }
      if (!subscription) {
        throw new Error(
          'No subscription provided. What values do you want to listen to?'
        )
      }
      const memoized = memoize(subscriber)
      const { subscribers } = state
      const index = subscribers.index++
      subscribers.entries[index] = {
        subscriber: memoized,
        subscription,
        notified: false
      }
      const nextFormState = calculateNextFormState()
      notifySubscriber(
        memoized,
        subscription,
        nextFormState,
        nextFormState,
        filterFormState,
        true
      )
      return () => {
        delete subscribers.entries[index]
      }
    }
  }
  return api
}

export default createForm
