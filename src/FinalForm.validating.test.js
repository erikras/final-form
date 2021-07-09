import createForm from './FinalForm'
import { ARRAY_ERROR } from './constants'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const onSubmitMock = (values, callback) => {}

describe('Field.validation', () => {
  it('should validate on change when validateOnBlur is false', () => {
    const validate = jest.fn(values => {
      const errors = {}
      if (!values.foo) {
        errors.foo = 'Required'
      }
      return errors
    })
    const form = createForm({
      onSubmit: onSubmitMock,
      validate
    })

    expect(validate).toHaveBeenCalledTimes(1)

    const spy = jest.fn()
    form.registerField('foo', spy, { error: true })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBe('Required')
    expect(validate).toHaveBeenCalledTimes(1)

    form.focus('foo')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1) // not called on focus
    form.change('foo', 't')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBeUndefined()
    expect(validate).toHaveBeenCalledTimes(2)
    form.change('foo', 'ty')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(3)
    form.change('foo', 'typ')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(4)
    form.change('foo', 'typi')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(5)
    form.change('foo', 'typin')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(6)
    form.change('foo', 'typing')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(7)
    form.blur('foo')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(7) // not called on blur

    // now user goes to empty the field
    form.focus('foo')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(7)
    form.change('foo', '')
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBe('Required')
    expect(validate).toHaveBeenCalledTimes(8)
    form.blur('foo')
    expect(validate).toHaveBeenCalledTimes(8)
  })

  it('should validate on blur when validateOnBlur is true', () => {
    const validate = jest.fn(values => {
      const errors = {}
      if (!values.foo) {
        errors.foo = 'Required'
      }
      return errors
    })
    const form = createForm({
      onSubmit: onSubmitMock,
      validate,
      validateOnBlur: true
    })

    expect(validate).toHaveBeenCalledTimes(1)

    const spy = jest.fn()
    form.registerField('foo', spy, { error: true })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBe('Required')
    expect(validate).toHaveBeenCalledTimes(1)

    form.focus('foo')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1) // not called on focus
    form.change('foo', 't')
    expect(spy).toHaveBeenCalledTimes(1) // error not updated
    expect(validate).toHaveBeenCalledTimes(1)
    form.change('foo', 'ty')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.change('foo', 'typ')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.change('foo', 'typi')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.change('foo', 'typin')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.change('foo', 'typing')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
    form.blur('foo')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBeUndefined()
    expect(validate).toHaveBeenCalledTimes(2) // called on blur

    // now user goes to empty the field
    form.focus('foo')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(2)
    form.change('foo', '')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(validate).toHaveBeenCalledTimes(2)
    form.blur('foo')
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBe('Required')
    expect(validate).toHaveBeenCalledTimes(3)
  })

  it("should return first subscribed field's error first", () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const spy1 = jest.fn()
    const unsubscribe1 = form.registerField(
      'foo',
      spy1,
      { error: true },
      { getValidator: () => value => (value ? undefined : 'Required') }
    )

    const spy2 = jest.fn()
    form.registerField(
      'foo',
      spy2,
      { error: true },
      {
        getValidator: () => value =>
          value !== 'correct' ? 'Incorrect value' : undefined
      }
    )

    // both called with first error
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy1.mock.calls[0][0].error).toBe('Required')
    expect(spy2).toHaveBeenCalledTimes(1)
    expect(spy2.mock.calls[0][0].error).toBe('Required')

    const { change } = spy1.mock.calls[0][0]
    change('hello')

    // both called with second error
    expect(spy1).toHaveBeenCalledTimes(2)
    expect(spy1.mock.calls[1][0].error).toBe('Incorrect value')
    expect(spy2).toHaveBeenCalledTimes(2)
    expect(spy2.mock.calls[1][0].error).toBe('Incorrect value')

    change('correct')

    // both called with no error
    expect(spy1).toHaveBeenCalledTimes(3)
    expect(spy1.mock.calls[2][0].error).toBeUndefined()
    expect(spy2).toHaveBeenCalledTimes(3)
    expect(spy2.mock.calls[2][0].error).toBeUndefined()

    change(undefined)

    // back to original state
    expect(spy1).toHaveBeenCalledTimes(4)
    expect(spy1.mock.calls[3][0].error).toBe('Required')
    expect(spy2).toHaveBeenCalledTimes(4)
    expect(spy2.mock.calls[3][0].error).toBe('Required')

    // unregister first field
    unsubscribe1()

    // only second one called with its error
    expect(spy1).toHaveBeenCalledTimes(4)
    expect(spy2).toHaveBeenCalledTimes(5)
    expect(spy2.mock.calls[4][0].error).toBe('Incorrect value')
  })

  it("should update a field's error if it was changed by another field's value change (record-level)", () => {
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: values => {
        const errors = {}
        if (values.password !== values.confirm) {
          errors.confirm = 'Does not match'
        }
        return errors
      }
    })
    const password = jest.fn()
    form.registerField('password', password)
    const confirm = jest.fn()
    form.registerField('confirm', confirm, { error: true })

    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(1)
    const changePassword = password.mock.calls[0][0].change
    const changeConfirm = confirm.mock.calls[0][0].change

    // confirm does not have error
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0].error).toBeUndefined()

    // user enters password into password field
    changePassword('secret')

    // password not updated because not subscribing to anything
    expect(password).toHaveBeenCalledTimes(1)

    // confirm now has error
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(confirm.mock.calls[1][0].error).toBe('Does not match')

    changeConfirm('secret')

    // confirm no longer has error
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(confirm.mock.calls[2][0].error).toBeUndefined()

    changePassword('not-secret')

    // confirm has error again
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(4)
    expect(confirm.mock.calls[3][0].error).toBe('Does not match')
  })

  it("should update a field's error if it was changed by another field's value change (field-level)", () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const password = jest.fn()
    form.registerField('password', password)
    const confirm = jest.fn()
    form.registerField(
      'confirm',
      confirm,
      { error: true },
      {
        getValidator: () => (value, allValues) =>
          value === allValues.password ? undefined : 'Does not match'
      }
    )

    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(1)
    const changePassword = password.mock.calls[0][0].change
    const changeConfirm = confirm.mock.calls[0][0].change

    // confirm does not have error
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm.mock.calls[0][0].error).toBeUndefined()

    // user enters password into password field
    changePassword('secret')

    // password not updated because not subscribing to anything
    expect(password).toHaveBeenCalledTimes(1)

    // confirm now has error
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(confirm.mock.calls[1][0].error).toBe('Does not match')

    changeConfirm('secret')

    // confirm no longer has error
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(3)
    expect(confirm.mock.calls[2][0].error).toBeUndefined()

    changePassword('not-secret')

    // confirm has error again
    expect(password).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledTimes(4)
    expect(confirm.mock.calls[3][0].error).toBe('Does not match')
  })

  it('should not mind if getValidator returns nothing', () => {
    // this is mostly for code coverage
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'foo',
      spy,
      { error: true },
      { getValidator: () => undefined }
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()
  })

  it('should use field level error over record level error', () => {
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: values => {
        const errors = {}
        if (!values.foo || values.foo.length < 3) {
          errors.foo = 'Too short'
        }
        return errors
      }
    })
    const spy = jest.fn()
    form.registerField(
      'foo',
      spy,
      { error: true },
      { getValidator: () => value => (value ? undefined : 'Required') }
    )

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBe('Required')

    const { change } = spy.mock.calls[0][0]

    change('hi')

    // error now changes to record level
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Too short')

    change('hi there')

    // no errors
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()

    change('')

    // error goes back to field level
    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[3][0].error).toBe('Required')
  })

  it('should allow record-level async validation via promises', async () => {
    const delay = 2
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: async values => {
        const errors = {}
        if (values.username === 'erikras') {
          errors.username = 'Username taken'
        }
        sleep(delay)
        return errors
      }
    })
    const spy = jest.fn()
    form.registerField('username', spy, { error: true })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()

    const { change } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('bob')

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('erikras')

    // still hasn't updated because validation has not yet returned
    expect(spy).toHaveBeenCalledTimes(1)

    // wait for validation to return
    await sleep(delay * 2)

    // we have an error now!
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Username taken')

    change('another')

    // still has error because async validation still running
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Username taken')

    // wait for validation to return
    await sleep(delay * 2)

    // spy not called because sync validation already cleared error
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()
  })

  it('async validate should wait for result - not set error to undefined via sync validation', async () => {
    const delay = 2
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: async (values) => {
        const errors = {}
        if (!values.username) {
          errors.username = 'Required'
        }
        await sleep(delay)
        return errors
      }
    })
    const spyValidatedField = jest.fn()
    const spy = jest.fn()
    form.registerField('username', spyValidatedField, { error: true })
    form.registerField('age', spy)

    const { change } = spy.mock.calls[0][0]

    expect(spyValidatedField).toHaveBeenCalledTimes(1)
    expect(spyValidatedField.mock.calls[0][0].error).toBeUndefined()

    change('20')

    await sleep(delay * 2)

    expect(spyValidatedField).toHaveBeenCalledTimes(2)
    expect(spyValidatedField.mock.calls[1][0].error).toBe('Required')

    change('40')

    // should not be called - async validation is still running
    expect(spyValidatedField).toHaveBeenCalledTimes(2)
    expect(spyValidatedField.mock.calls[1][0].error).toBe('Required')

    await sleep(delay * 2)

    // should not be called - validation return same errors like earlier
    expect(spyValidatedField).toHaveBeenCalledTimes(2)
    expect(spyValidatedField.mock.calls[1][0].error).toBe('Required')
  })

  it('should ignore old validation promise results', async () => {
    const delay = 10
    const validate = jest.fn(values => {
      const errors = {}
      if (values.username === 'erikras') {
        errors.username = 'Username taken'
        return errors
      }

      // valid values will take longer to validate than error values
      return sleep(delay).then(() => errors)
    })
    const form = createForm({
      onSubmit: onSubmitMock,
      validate
    })

    const spy = jest.fn()
    form.registerField('username', spy, { error: true })

    // valid input
    form.change('username', 'erikra')
    // invalid input
    form.change('username', 'erikras')

    // wait for validation to return
    await sleep(delay * 2)

    // if the previous validation result (which would be valid) was correctly cancelled,
    // we will have an error now
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Username taken')
  })

  it('should leave validating flag as false when field-level validation is sync', async () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'username',
      spy,
      { validating: true },
      {
        getValidator: () => (value, allErrors) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          return error
        }
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].validating).toBe(false)
  })

  it('should update validating flag during and after async field-level validation', async () => {
    const delay = 2
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'username',
      spy,
      { error: true, validating: true },
      {
        getValidator: () => async (value, allErrors) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          await sleep(delay)
          return error
        },
        subscribeToEachFieldsPromise: true
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()
    expect(spy.mock.calls[0][0].validating).toBe(true)

    const { change } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // called after promised resolved
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBeUndefined()
    expect(spy.mock.calls[1][0].validating).toBe(false)

    change('something')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()
    expect(spy.mock.calls[2][0].validating).toBe(true)

    await sleep(delay * 2)

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[3][0].error).toBeUndefined()
    expect(spy.mock.calls[3][0].validating).toBe(false)

    change('erikras')

    expect(spy).toHaveBeenCalledTimes(5)
    expect(spy.mock.calls[4][0].error).toBeUndefined()
    expect(spy.mock.calls[4][0].validating).toBe(true)

    await sleep(delay * 2)

    expect(spy).toHaveBeenCalledTimes(6)
    expect(spy.mock.calls[5][0].error).toBe('Username taken')
    expect(spy.mock.calls[5][0].validating).toBe(false)
  })

  it('should update validating flag during and after async field-level validation without focus', async () => {
    const delay = 2
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'username',
      spy,
      { error: true, validating: true },
      {
        getValidator: () => async (value, allErrors) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          await sleep(delay)
          return error
        },
        subscribeToEachFieldsPromise: true
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()
    expect(spy.mock.calls[0][0].validating).toBe(true)

    const { change, blur } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // called after promised resolved
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBeUndefined()
    expect(spy.mock.calls[1][0].validating).toBe(false)

    change('something')
    blur()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()
    expect(spy.mock.calls[2][0].validating).toBe(true)

    await sleep(delay * 2)

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[3][0].error).toBeUndefined()
    expect(spy.mock.calls[3][0].validating).toBe(false)

    change('erikras')
    blur()

    expect(spy).toHaveBeenCalledTimes(5)
    expect(spy.mock.calls[4][0].error).toBeUndefined()
    expect(spy.mock.calls[4][0].validating).toBe(true)

    await sleep(delay * 2)

    expect(spy).toHaveBeenCalledTimes(6)
    expect(spy.mock.calls[5][0].error).toBe('Username taken')
    expect(spy.mock.calls[5][0].validating).toBe(false)
  })

  it('should allow field-level async validation via promise', async () => {
    const delay = 2
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'username',
      spy,
      { error: true },
      {
        getValidator: () => async (value, allErrors) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          await sleep(delay)
          return error
        }
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()

    const { change } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('bob')

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('erikras')

    // still hasn't updated because validation has not yet returned
    expect(spy).toHaveBeenCalledTimes(1)

    // wait for validation to return
    await sleep(delay * 2)

    // we have an error now!
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Username taken')

    change('another')

    // sync validation ran and cleared the error
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()

    // wait for validation to return
    await sleep(delay * 2)

    // not called after async validation finished because it was already und
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('should provide field state to field-level validator', async () => {
    const delay = 2
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.registerField(
      'username',
      spy,
      { error: true },
      {
        getValidator: () => async (value, allErrors, fieldState) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          expect(fieldState).toBeDefined()
          await sleep(delay)
          return error
        }
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()

    const { change } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('bob')

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('erikras')

    // still hasn't updated because validation has not yet returned
    expect(spy).toHaveBeenCalledTimes(1)

    // wait for validation to return
    await sleep(delay * 2)

    // we have an error now!
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].error).toBe('Username taken')

    change('another')

    // sync validation ran and cleared the error
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].error).toBeUndefined()

    // wait for validation to return
    await sleep(delay * 2)

    // not called after async validation finished because it was already und
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('should not fall over if a field has been unregistered during async validation', async () => {
    const delay = 2
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    const unregister = form.registerField(
      'username',
      spy,
      { error: true },
      {
        getValidator: () => async (value, allErrors) => {
          const error = value === 'erikras' ? 'Username taken' : undefined
          await sleep(delay)
          return error
        }
      }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].error).toBeUndefined()

    const { change } = spy.mock.calls[0][0]

    await sleep(delay * 2)

    // error hasn't changed
    expect(spy).toHaveBeenCalledTimes(1)

    change('erikras')

    // unregister field
    unregister()

    await sleep(delay * 2)

    // spy not called again
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should remove field-level validation errors when a field is unregistered', () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.subscribe(spy, { errors: 1 })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].errors).toEqual({})

    const unregister = form.registerField(
      'username',
      () => {},
      { errors: true },
      {
        getValidator: () => value => (value ? undefined : 'Required')
      }
    )
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].errors).toEqual({ username: 'Required' })

    unregister()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].errors).toEqual({})
  })

  it('should not remove record-level validation errors when a field is unregistered', () => {
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: values => ({ username: 'Required by record-level' })
    })
    const spy = jest.fn()
    form.subscribe(spy, { errors: 1 })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].errors).toEqual({
      username: 'Required by record-level'
    })

    const unregister = form.registerField(
      'username',
      () => {},
      { errors: true },
      {
        getValidator: () => value => (value ? undefined : 'Required')
      }
    )
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].errors).toEqual({ username: 'Required' })

    unregister()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].errors).toEqual({
      username: 'Required by record-level'
    })
  })

  it('should allow field-level for array fields', () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const array = jest.fn()
    const validate = jest.fn(
      value =>
        value &&
        value.map(customer => {
          const errors = {}
          if (!customer.firstName) {
            errors.firstName = 'Required'
          }
          return errors
        })
    )
    const spy = jest.fn()
    form.subscribe(spy, { errors: true })
    form.registerField(
      'customers',
      array,
      { error: true },
      {
        getValidator: () => validate,
        validateFields: []
      }
    )
    expect(validate).toHaveBeenCalledTimes(1)
    expect(validate.mock.calls[0][0]).toBeUndefined()
    expect(array).toHaveBeenCalledTimes(1)
    expect(array.mock.calls[0][0].error).toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].errors).toEqual({})

    // add an empty customer
    form.change('customers', [{}])

    expect(validate).toHaveBeenCalledTimes(2)
    expect(validate.mock.calls[1][0]).toEqual([{}])
    expect(array).toHaveBeenCalledTimes(2)
    expect(array.mock.calls[1][0].error).toEqual([{ firstName: 'Required' }])
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].errors).toEqual({
      customers: [{ firstName: 'Required' }]
    })

    // adding the customer registers a new field
    const firstName0 = jest.fn()
    form.registerField('customers[0].firstName', firstName0, { error: true })

    expect(validate).toHaveBeenCalledTimes(2)
    expect(validate.mock.calls[1][0]).toEqual([{}])
    expect(array).toHaveBeenCalledTimes(2)
    expect(array.mock.calls[1][0].error).toEqual([{ firstName: 'Required' }])
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].errors).toEqual({
      customers: [{ firstName: 'Required' }]
    })
    expect(firstName0).toHaveBeenCalled()
    expect(firstName0).toHaveBeenCalledTimes(1)
    expect(firstName0.mock.calls[0][0].error).toBe('Required')

    // add another empty customer
    form.change('customers', [{}, {}])

    expect(validate).toHaveBeenCalledTimes(3)
    expect(validate.mock.calls[2][0]).toEqual([{}, {}])
    expect(array).toHaveBeenCalledTimes(3)
    expect(array.mock.calls[2][0].error).toEqual([
      { firstName: 'Required' },
      { firstName: 'Required' }
    ])
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].errors).toEqual({
      customers: [{ firstName: 'Required' }, { firstName: 'Required' }]
    })
    expect(firstName0).toHaveBeenCalledTimes(1) // no need to call this again

    // adding the customer registers a new field
    const firstName1 = jest.fn()
    form.registerField('customers[1].firstName', firstName1, { error: true })

    expect(validate).toHaveBeenCalledTimes(3)
    expect(validate.mock.calls[2][0]).toEqual([{}, {}])
    expect(array).toHaveBeenCalledTimes(3)
    expect(array.mock.calls[2][0].error).toEqual([
      { firstName: 'Required' },
      { firstName: 'Required' }
    ])
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].errors).toEqual({
      customers: [{ firstName: 'Required' }, { firstName: 'Required' }]
    })
    expect(firstName1).toHaveBeenCalled()
    expect(firstName1).toHaveBeenCalledTimes(1)
    expect(firstName1.mock.calls[0][0].error).toBe('Required')
  })

  it('should only validate changed field when validateFields is empty', () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const foo = jest.fn()
    const bar = jest.fn()
    const baz = jest.fn()
    const required = value => (value ? undefined : false)
    const validateFoo = jest.fn(required)
    const validateBar = jest.fn(required)
    const validateBaz = jest.fn(required)
    const spy = jest.fn()
    form.subscribe(spy, { errors: true })
    form.registerField(
      'foo',
      foo,
      { error: true },
      { getValidator: () => validateFoo, validateFields: [] }
    )
    form.registerField(
      'bar',
      bar,
      { error: true },
      { getValidator: () => validateBar }
    )
    form.registerField(
      'baz',
      baz,
      { error: true },
      { getValidator: () => validateBaz }
    )

    expect(validateFoo).toHaveBeenCalledTimes(3)
    expect(validateFoo.mock.calls[0][0]).toBeUndefined()
    expect(validateFoo.mock.calls[1][0]).toBeUndefined()
    expect(validateFoo.mock.calls[2][0]).toBeUndefined()

    expect(validateBar).toHaveBeenCalledTimes(2)
    expect(validateBar.mock.calls[0][0]).toBeUndefined()
    expect(validateBar.mock.calls[1][0]).toBeUndefined()

    expect(validateBaz).toHaveBeenCalledTimes(1)
    expect(validateBaz.mock.calls[0][0]).toBeUndefined()

    // changing bar calls validate on every field
    form.change('bar', 'hello')

    expect(validateFoo).toHaveBeenCalledTimes(4)
    expect(validateFoo.mock.calls[3][0]).toBeUndefined()
    expect(validateBar).toHaveBeenCalledTimes(3)
    expect(validateBar.mock.calls[2][0]).toBe('hello')
    expect(validateBaz).toHaveBeenCalledTimes(2)
    expect(validateBaz.mock.calls[1][0]).toBeUndefined()

    // changing foo ONLY calls validate on foo
    form.change('foo', 'world')

    expect(validateFoo).toHaveBeenCalledTimes(5)
    expect(validateFoo.mock.calls[4][0]).toBe('world')
    expect(validateBar).toHaveBeenCalledTimes(3)
    expect(validateBaz).toHaveBeenCalledTimes(2)
  })

  it('should only validate specified validateFields', () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const foo = jest.fn()
    const bar = jest.fn()
    const baz = jest.fn()
    const required = value => (value ? undefined : false)
    const validateFoo = jest.fn(required)
    const validateBar = jest.fn(required)
    const validateBaz = jest.fn(required)
    const spy = jest.fn()
    form.subscribe(spy, { errors: true })
    form.registerField(
      'foo',
      foo,
      { error: true },
      { getValidator: () => validateFoo, validateFields: ['baz'] }
    )
    form.registerField(
      'bar',
      bar,
      { error: true },
      { getValidator: () => validateBar }
    )
    form.registerField(
      'baz',
      baz,
      { error: true },
      { getValidator: () => validateBaz }
    )

    expect(validateFoo).toHaveBeenCalledTimes(3)
    expect(validateFoo.mock.calls[0][0]).toBeUndefined()
    expect(validateFoo.mock.calls[1][0]).toBeUndefined()
    expect(validateFoo.mock.calls[2][0]).toBeUndefined()

    expect(validateBar).toHaveBeenCalledTimes(2)
    expect(validateBar.mock.calls[0][0]).toBeUndefined()
    expect(validateBar.mock.calls[1][0]).toBeUndefined()

    expect(validateBaz).toHaveBeenCalledTimes(1)
    expect(validateBaz.mock.calls[0][0]).toBeUndefined()

    // changing bar calls validate on every field
    form.change('bar', 'hello')

    expect(validateFoo).toHaveBeenCalledTimes(4)
    expect(validateFoo.mock.calls[3][0]).toBeUndefined()
    expect(validateBar).toHaveBeenCalledTimes(3)
    expect(validateBar.mock.calls[2][0]).toBe('hello')
    expect(validateBaz).toHaveBeenCalledTimes(2)
    expect(validateBaz.mock.calls[1][0]).toBeUndefined()

    // changing foo ONLY calls validate on foo and baz
    form.change('foo', 'world')

    expect(validateFoo).toHaveBeenCalledTimes(5)
    expect(validateFoo.mock.calls[4][0]).toBe('world')
    expect(validateBar).toHaveBeenCalledTimes(3) // NOT called
    expect(validateBaz).toHaveBeenCalledTimes(3)
    expect(validateBaz.mock.calls[2][0]).toBeUndefined()
  })

  it('should allow validation to be paused', () => {
    const validate = jest.fn()
    const form = createForm({ onSubmit: onSubmitMock, validate })
    expect(validate).toHaveBeenCalledTimes(1)

    const fooValidate = jest.fn()
    const barValidate = jest.fn()
    const bazValidate = jest.fn()
    expect(form.isValidationPaused()).toBe(false)
    form.pauseValidation()
    expect(form.isValidationPaused()).toBe(true)
    form.registerField(
      'foo',
      () => {},
      { error: true },
      { getValidator: () => fooValidate }
    )
    form.registerField(
      'bar',
      () => {},
      { error: true },
      { getValidator: () => barValidate }
    )
    form.registerField(
      'baz',
      () => {},
      { error: true },
      { getValidator: () => bazValidate }
    )

    expect(validate).toHaveBeenCalledTimes(1)
    expect(fooValidate).not.toHaveBeenCalled()
    expect(barValidate).not.toHaveBeenCalled()
    expect(bazValidate).not.toHaveBeenCalled()

    form.resumeValidation()
    expect(form.isValidationPaused()).toBe(false)

    expect(validate).toHaveBeenCalledTimes(2)
    expect(fooValidate).toHaveBeenCalledTimes(1)
    expect(barValidate).toHaveBeenCalledTimes(1)
    expect(bazValidate).toHaveBeenCalledTimes(1)
  })

  it('should allow validation to be paused and notifications still fired', () => {
    const validate = jest.fn()
    const form = createForm({ onSubmit: onSubmitMock, validate })
    expect(validate).toHaveBeenCalledTimes(1)

    expect(form.isValidationPaused()).toBe(false)
    form.pauseValidation()
    expect(form.isValidationPaused()).toBe(true)

    const fooValidate = jest.fn()
    const fooSubscriber = jest.fn()

    form.registerField(
      'foo',
      fooSubscriber,
      { error: true, value: true },
      { getValidator: () => fooValidate }
    )

    expect(fooSubscriber).toHaveBeenCalledTimes(1)

    form.change('foo', 'Hello')

    expect(validate).toHaveBeenCalledTimes(1)
    expect(fooValidate).not.toHaveBeenCalled()
    expect(fooSubscriber).toHaveBeenCalledTimes(2)

    form.resumeValidation()
    expect(form.isValidationPaused()).toBe(false)
    expect(validate).toHaveBeenCalledTimes(2)
    expect(fooValidate).toHaveBeenCalledTimes(1)
  })

  it('should not fire validation on resume if it is not needed', () => {
    const validate = jest.fn()
    const form = createForm({ onSubmit: onSubmitMock, validate })
    expect(validate).toHaveBeenCalledTimes(1)

    const fooValidate = jest.fn()
    form.registerField(
      'foo',
      () => {},
      { error: true },
      { getValidator: () => fooValidate }
    )

    expect(validate).toHaveBeenCalledTimes(2)
    expect(fooValidate).toHaveBeenCalledTimes(1)

    form.pauseValidation()
    form.resumeValidation()

    expect(validate).toHaveBeenCalledTimes(2)
    expect(fooValidate).toHaveBeenCalledTimes(1)
  })

  it('should allow for array fields to both have errors and for the array itself to have an error', () => {
    const validate = jest.fn(values => {
      const errors = {}
      errors.items = values.items.map(value => (value ? undefined : 'Required'))
      errors.items[ARRAY_ERROR] = 'Need more items'
      return errors
    })

    const form = createForm({
      onSubmit: onSubmitMock,
      validate,
      initialValues: {
        items: ['Dog', '']
      }
    })
    expect(validate).toHaveBeenCalledTimes(1)

    const items = jest.fn()
    const items0 = jest.fn()
    const items1 = jest.fn()
    form.registerField('items', items, { error: true })
    expect(items).toHaveBeenCalled()
    expect(items).toHaveBeenCalledTimes(1)
    expect(items.mock.calls[0][0].error).toBe('Need more items')

    form.registerField('items[0]', items0, { error: true })
    expect(items0).toHaveBeenCalled()
    expect(items0).toHaveBeenCalledTimes(1)
    expect(items0.mock.calls[0][0].error).toBeUndefined()

    form.registerField('items[1]', items1, { error: true })
    expect(items1).toHaveBeenCalled()
    expect(items1).toHaveBeenCalledTimes(1)
    expect(items1.mock.calls[0][0].error).toBe('Required')

    expect(validate).toHaveBeenCalledTimes(1)

    form.change('items[1]', 'Cat')
    expect(validate).toHaveBeenCalledTimes(2)
    expect(items).toHaveBeenCalledTimes(1)
    expect(items0).toHaveBeenCalledTimes(1)
    expect(items1).toHaveBeenCalledTimes(2)
    expect(items1.mock.calls[1][0].error).toBeUndefined()
  })

  it('should not blow away all field-level validation errors when one is remedied and no validateFields', () => {
    // https://github.com/final-form/final-form/issues/75
    const form = createForm({ onSubmit: onSubmitMock })
    const config = {
      getValidator: () => value => (value ? undefined : 'Required'),
      validateFields: []
    }

    const foo = jest.fn()
    const bar = jest.fn()
    form.registerField('foo', foo, { error: true }, config)
    form.registerField('bar', bar, { error: true }, config)

    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBe('Required')

    expect(bar).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledTimes(1)
    expect(bar.mock.calls[0][0].error).toBe('Required')

    form.change('bar', 'hi')

    expect(foo).toHaveBeenCalledTimes(1)
    expect(bar).toHaveBeenCalledTimes(2)
    expect(bar.mock.calls[1][0].error).toBeUndefined()
  })

  it('should mark the form as valid when all required fields are completed', () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const config = {
      getValidator: () => value => (value ? undefined : 'Required'),
      validateFields: []
    }

    const foo = jest.fn()
    const bar = jest.fn()

    form.registerField('foo', foo, { error: true }, config)
    form.registerField('bar', bar, { error: true })

    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBe('Required')

    form.change('foo', 'hi')

    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].error).toBe(undefined)

    expect(form.getState().invalid).toBe(false)
  })

  it('should not blow away all field-level validation errors when one is remedied and one validateFields', () => {
    const form = createForm({ onSubmit: onSubmitMock })

    const foo = jest.fn()
    const bar = jest.fn()
    form.registerField(
      'foo',
      foo,
      { error: true },
      {
        getValidator: () => value => (value ? undefined : 'Required'),
        validateFields: ['baz']
      }
    )
    form.registerField(
      'bar',
      bar,
      { error: true },
      {
        getValidator: () => value => (value ? undefined : 'Required'),
        validateFields: ['baz']
      }
    )
    form.registerField('baz', () => {}, {})

    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBe('Required')

    expect(bar).toHaveBeenCalled()
    expect(bar).toHaveBeenCalledTimes(1)
    expect(bar.mock.calls[0][0].error).toBe('Required')

    form.change('bar', 'hi')

    expect(foo).toHaveBeenCalledTimes(1)
    expect(bar).toHaveBeenCalledTimes(2)
    expect(bar.mock.calls[1][0].error).toBeUndefined()
  })

  it('should show form as invalid if has field-level validation errors', () => {
    // Created while debugging https://github.com/final-form/react-final-form/issues/196
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.subscribe(spy, { invalid: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].invalid).toBe(false)

    const foo = jest.fn()
    form.registerField(
      'foo',
      foo,
      { error: true, invalid: true },
      { getValidator: () => value => (value ? undefined : 'Required') }
    )

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0].invalid).toBe(true)
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBe('Required')
    expect(foo.mock.calls[0][0].invalid).toBe(true)

    form.change('foo', 'hi')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].invalid).toBe(false)
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].error).toBeUndefined()
    expect(foo.mock.calls[1][0].invalid).toBe(false)
  })

  it('should have validating true until the promise resolves', async () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.subscribe(spy, { validating: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].validating).toBe(false)

    const foo = jest.fn()
    form.registerField(
      'foo',
      foo,
      { error: true, invalid: true },
      {
        getValidator: () => async value => {
          await sleep(2)
          return value ? undefined : 'Required'
        }
      }
    )

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][0].validating).toBe(false)
    expect(spy.mock.calls[1][0].validating).toBe(true)
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBeUndefined()
    expect(foo.mock.calls[0][0].invalid).toBe(false)

    await sleep(3)

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].validating).toBe(false)
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].error).toBe('Required')
    expect(foo.mock.calls[1][0].invalid).toBe(true)

    form.change('foo', 'hi')

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[3][0].validating).toBe(true)
    expect(foo).toHaveBeenCalledTimes(3)
    // Why? Because with async field-level validation, it gets set to valid
    // while the validator is running. This is probably not optimal, but
    // rarely causes problems in practice.
    expect(foo.mock.calls[2][0].error).toBeUndefined()
    expect(foo.mock.calls[2][0].invalid).toBe(false)

    await sleep(3)

    expect(spy).toHaveBeenCalledTimes(5)
    expect(spy.mock.calls[4][0].validating).toBe(false)
    expect(foo).toHaveBeenCalledTimes(3)
    expect(foo.mock.calls[2][0].error).toBeUndefined()
    expect(foo.mock.calls[2][0].invalid).toBe(false)
  })

  it('should have validating true until the promise rejects', async () => {
    const form = createForm({ onSubmit: onSubmitMock })
    const spy = jest.fn()
    form.subscribe(spy, { validating: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].validating).toBe(false)

    const foo = jest.fn()
    form.registerField(
      'foo',
      foo,
      { error: true, invalid: true },
      {
        getValidator: () => value =>
          new Promise((resolve, reject) => {
            sleep(2).then(() => {
              if (value) {
                resolve(undefined)
              } else {
                reject('Required')
              }
            })
          })
      }
    )

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][0].validating).toBe(false)
    expect(spy.mock.calls[1][0].validating).toBe(true)
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBeUndefined()
    expect(foo.mock.calls[0][0].invalid).toBe(false)

    await sleep(3)

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0].validating).toBe(false)
    expect(foo).toHaveBeenCalledTimes(1) // error was not resolved

    form.change('foo', 'hi')

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy.mock.calls[3][0].validating).toBe(true)
    expect(foo).toHaveBeenCalledTimes(1) // error was not resolved

    await sleep(3)

    expect(spy).toHaveBeenCalledTimes(5)
    expect(spy.mock.calls[4][0].validating).toBe(false)
    expect(foo).toHaveBeenCalledTimes(1) // error was not resolved
  })

  it('should notify all field subscribers when field validation result changes', () => {
    const form = createForm({ onSubmit: onSubmitMock })

    const foo1 = jest.fn()
    form.registerField('foo', foo1, { error: true })
    expect(foo1).toHaveBeenCalledTimes(1)
    expect(foo1.mock.calls[0][0].error).toBeUndefined()

    const foo2 = jest.fn()
    form.registerField('foo', foo2, { error: true })
    expect(foo2).toHaveBeenCalledTimes(1)
    expect(foo2.mock.calls[0][0].error).toBeUndefined()

    // Each listener called once.

    // Did not need to call first listener again
    expect(foo1).toHaveBeenCalledTimes(1)

    // Now we introduce a field with field-level validation
    const foo3 = jest.fn()
    form.registerField(
      'foo',
      foo3,
      { error: true },
      {
        getValidator: () => value => (value ? undefined : 'Required')
      }
    )
    expect(foo3).toHaveBeenCalledTimes(1)
    expect(foo3.mock.calls[0][0].error).toBe('Required')

    // We also have to notify the other field listeners that we now have an error!
    expect(foo1).toHaveBeenCalledTimes(2)
    expect(foo1.mock.calls[1][0].error).toBe('Required')
    expect(foo2).toHaveBeenCalledTimes(2)
    expect(foo2.mock.calls[1][0].error).toBe('Required')

    // provide value and all get notified of error going away
    foo1.mock.calls[0][0].change('bar')
    expect(foo1).toHaveBeenCalledTimes(3)
    expect(foo1.mock.calls[2][0].error).toBeUndefined()
    expect(foo2).toHaveBeenCalledTimes(3)
    expect(foo2.mock.calls[2][0].error).toBeUndefined()
    expect(foo3).toHaveBeenCalledTimes(2)
    expect(foo3.mock.calls[1][0].error).toBeUndefined()

    // change again and no notification
    foo1.mock.calls[0][0].change('bartender')
    expect(foo1).toHaveBeenCalledTimes(3)
    expect(foo2).toHaveBeenCalledTimes(3)
    expect(foo3).toHaveBeenCalledTimes(2)
  })

  it('should only call validate on field register if field-level validation provided', () => {
    const validate = jest.fn()
    const form = createForm({ onSubmit: onSubmitMock, validate })
    expect(validate).toHaveBeenCalledTimes(1)

    form.registerField('a', () => {}, { error: true })
    form.registerField('b', () => {}, { error: true })

    expect(validate).toHaveBeenCalledTimes(1)

    const cValidate = jest.fn()
    form.registerField(
      'c',
      () => {},
      { error: true },
      { getValidator: () => cValidate }
    )
    expect(validate).toHaveBeenCalledTimes(2)
    expect(cValidate).toHaveBeenCalledTimes(1)

    // must actually call getValidator() to see if there's a function there
    form.registerField(
      'd',
      () => {},
      { error: true },
      { getValidator: () => undefined }
    )
    expect(validate).toHaveBeenCalledTimes(2)

    form.change('a', 'foo')
    expect(validate).toHaveBeenCalledTimes(3)
  })
  it('should mark the form as valid when required fields are initialized with a value', () => {
    const form = createForm({
      onSubmit: onSubmitMock,
      validate: values => {
        const errors = {}
        if (!values.foo) {
          errors.foo = 'Required'
        }
        return errors
      }
    })
    const foo = jest.fn()
    form.registerField('foo', foo, { error: true }, { initialValue: 'bar' })
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].error).toBe(undefined)
    expect(form.getState().invalid).toBe(false)
    form.change('foo', '')
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].error).toBe('Required')
    expect(form.getState().invalid).toBe(true)
  })

  it('should pass in all three arguments into a wrapped validate function with unknown number of arguments', () => {
    const form = createForm({
      onSubmit: onSubmitMock
    });
    const noArg = jest.fn()
    
    form.registerField('foo', () => {}, { error: true }, { initialValue: 'value', getValidator: () => noArg })
    const meta = form.getFieldState('foo')
    const { values } = form.getState()

    expect(noArg).toHaveBeenNthCalledWith(1, values.foo, values, meta)
  })

  it('should not pass field state to a validator function with 1 or 2 arguments', () => {
    const form = createForm({
      onSubmit: onSubmitMock
    });
    const oneArg = jest.fn(val => {})
    const twoArg = jest.fn((val, all) => {})
    const threeArg = jest.fn((val, all, meta) => {})
    
    form.registerField('foo', () => {}, { error: true }, { initialValue: 'value', getValidator: () => oneArg })
    form.registerField('bar', () => {}, { error: true }, { initialValue: 'value', getValidator: () => twoArg })
    form.registerField('baz', () => {}, { error: true }, { initialValue: 'value', getValidator: () => threeArg })

    const meta = form.getFieldState('baz')

    expect(oneArg.mock.calls[0][2]).toBeUndefined()
    expect(twoArg.mock.calls[0][2]).toBeUndefined()
    expect(threeArg.mock.calls[0][2]).toEqual(meta)
  })
})
