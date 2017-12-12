export type Subscription = { [key: string]: boolean }
export type Subscriber<V> = (value: V) => void

export type FormSubscription = Partial<{
  active: boolean,
  dirty: boolean,
  error: boolean,
  errors: boolean,
  initialValues: boolean,
  invalid: boolean,
  pristine: boolean,
  submitError: boolean,
  submitErrors: boolean,
  submitFailed: boolean,
  submitSucceeded: boolean,
  submitting: boolean,
  valid: boolean,
  validating: boolean,
  values: boolean
}> & Subscription

export type FormState = Partial<{
  // all values are optional because they must be subscribed to
  active: string,
  dirty: boolean,
  error: any,
  errors: Object,
  initialValues: Object,
  invalid: boolean,
  pristine: boolean,
  submitError: any,
  submitErrors: Object,
  submitFailed: boolean,
  submitSucceeded: boolean,
  submitting: boolean,
  valid: boolean,
  validating: boolean,
  values: Object
}>

export type FormSubscriber = Subscriber<FormState>

export type FieldState = {
  active?: boolean,
  blur: () => void,
  change: (value: any) => void,
  data?: Object,
  dirty?: boolean,
  error?: any,
  focus: () => void,
  initial?: any,
  invalid?: boolean,
  length?: number,
  name: string,
  pristine?: boolean,
  submitError?: any,
  submitFailed?: boolean,
  submitSucceeded?: boolean,
  touched?: boolean,
  valid?: boolean,
  value?: any,
  visited?: boolean
}

export type FieldSubscription = Partial<{
  active: boolean,
  data: boolean,
  dirty: boolean,
  error: boolean,
  initial: boolean,
  invalid: boolean,
  length: boolean,
  pristine: boolean,
  submitError: boolean,
  submitFailed: boolean,
  submitSucceeded: boolean,
  touched: boolean,
  valid: boolean,
  value: boolean,
  visited: boolean
}> & Subscription

export type FieldSubscriber = Subscriber<FieldState>

export type Unsubscribe = () => void

export type RegisterField = (
  name: string,
  subscriber: FieldSubscriber,
  subscription: FieldSubscription,
  validate?: (value: any, allValues: Object) => any
) => Unsubscribe

export type InternalFieldState = {
  active: boolean,
  blur: () => void,
  change: (value: any) => void,
  data: Object,
  error?: any,
  focus: () => void,
  lastFieldState?: FieldState,
  length?: any,
  name: string,
  submitError?: any,
  pristine: boolean,
  touched: boolean,
  validators: {
    [index: number]: (value: any, allValues: Object) => any | Promise<any>
  },
  valid: boolean,
  visited: boolean
}

export type InternalFormState = {
  active?: string,
  error?: any,
  errors: Object,
  initialValues?: Object,
  pristine: boolean,
  submitError?: any,
  submitErrors?: Object,
  submitFailed: boolean,
  submitSucceeded: boolean,
  submitting: boolean,
  valid: boolean,
  validating: number,
  values: Object
}

export type FormApi = {
  batch: (fn: () => void) => void,
  blur: (name: string) => void,
  change: (name: string, value?: any) => void,
  focus: (name: string) => void,
  initialize: (values: Object) => void,
  getRegisteredFields: () => string[],
  getState: () => FormState,
  mutators?: { [key: string]: Function },
  submit: () => Promise<Object | undefined> | undefined,
  subscribe: (
    subscriber: FormSubscriber,
    subscription: FormSubscription
  ) => Unsubscribe,
  registerField: RegisterField,
  reset: () => void
}

export type DebugFunction = (
  state: FormState,
  fieldStates: { [key: string]: FieldState }
) => void

export type MutableState = {
  formState: InternalFormState,
  fields: {
    [key: string]: InternalFieldState
  }
}

export type GetIn = (state: Object, complexKey: string) => any
export type SetIn = (state: Object, key: string, value: any) => Object
export type ShallowEqual = (a: any, b: any) => boolean
export type ChangeValue = (
  state: MutableState,
  name: string,
  mutate: (value: any) => any
) => void
export type Tools = {
  changeValue: ChangeValue,
  getIn: GetIn,
  setIn: SetIn,
  shallowEqual: ShallowEqual
}

export type Mutator = (args: any[], state: MutableState, tools: Tools) => any

export type Config = {
  debug?: DebugFunction,
  initialValues?: Object,
  mutators?: { [key: string]: Mutator },
  onSubmit: (
    values: Object,
    callback?: (errors?: Object) => void
  ) => Object | Promise<Object | undefined> | undefined | void,
  validate?: (values: Object) => Object | Promise<Object>,
  validateOnBlur?: boolean
}

export type Decorator = (form: FormApi) => Unsubscribe

export function createForm(config: Config): FormApi
export var fieldSubscriptionItems: string[]
export var formSubscriptionItems: string[]
export var FORM_ERROR: any
export function getIn(state: Object, complexKey: string): any
export function setIn(state: Object, key: string, value: any): Object
export var version: string
