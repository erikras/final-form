// @flow
import type { InternalFieldState, InternalFormState } from './types'
import type { FieldState } from './types'
import getIn from './structure/getIn'

/**
 * Converts internal field state to published field state
 */
const publishFieldState = (
  formState: InternalFormState,
  field: InternalFieldState
): FieldState => {
  const { initialValues, submitFailed, submitSucceeded, values } = formState
  const {
    active,
    blur,
    change,
    data,
    error,
    focus,
    name,
    submitError,
    touched,
    visited
  } = field
  const value = getIn(values, name)
  const initial = initialValues && getIn(initialValues, name)
  const pristine = initial === value
  const valid = !error && !submitError
  return {
    active,
    blur,
    change,
    data,
    dirty: !pristine,
    error,
    focus,
    initial,
    invalid: !valid,
    length: Array.isArray(value) ? value.length : undefined,
    name,
    pristine,
    submitError,
    submitFailed,
    submitSucceeded,
    touched,
    valid,
    value,
    visited
  }
}

export default publishFieldState
