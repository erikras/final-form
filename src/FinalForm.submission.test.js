import { FORM_ERROR } from '.'
import createForm from './FinalForm'

const last = arr => (arr.length ? arr[arr.length - 1] : null)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('FinalForm.submission', () => {
  it('should not submit if form has validation errors', () => {
    const onSubmit = jest.fn()
    const form = createForm({
      onSubmit,
      validate: values => {
        const errors = {}
        if (!values.username) {
          errors.username = 'Required'
        }
        return errors
      }
    })
    const username = jest.fn()
    const password = jest.fn()
    form.registerField('username', username, { error: true })
    form.registerField('password', password, { touched: true })
    expect(username).toHaveBeenCalledTimes(1)
    expect(username.mock.calls[0][0].error).toBe('Required')
    expect(password).toHaveBeenCalledTimes(1)
    expect(password.mock.calls[0][0].touched).toBe(false)

    const { change } = username.mock.calls[0][0]

    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(password).toHaveBeenCalledTimes(2)
    expect(password.mock.calls[1][0].touched).toBe(true)

    change('erikras')

    // form is valid now, so submit should work
    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toBeDefined()
    expect(onSubmit.mock.calls[0][0].username).toBe('erikras')
  })

  it('should not submit if form has validation errors, even on non-registered fields', () => {
    const onSubmit = jest.fn()
    const form = createForm({
      onSubmit,
      validate: values => {
        const errors = {}
        if (!values.username) {
          errors.username = 'Required'
        }
        if (!values.password) {
          errors.password = 'Required'
        }
        return errors
      }
    })
    const spy = jest.fn()
    form.subscribe(spy, {
      submitFailed: true
    })
    const username = jest.fn()
    form.registerField('username', username, { error: true })

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({ submitFailed: false })
    expect(username).toHaveBeenCalledTimes(1)
    expect(username.mock.calls[0][0].error).toBe('Required')

    form.change('username', 'erikras')

    expect(username).toHaveBeenCalledTimes(2)
    expect(username.mock.calls[1][0].error).toBeUndefined()
    expect(spy).toHaveBeenCalledTimes(1)

    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit).not.toHaveBeenCalled()

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({ submitFailed: true })
  })

  it('should call onSubmit when form.submit() is called', () => {
    const onSubmit = jest.fn()
    const form = createForm({ onSubmit })
    form.registerField('foo', () => {})
    form.registerField('foo2', () => {})

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })
  })

  it('should support synchronous submission with errors', () => {
    const onSubmit = jest.fn(values => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    form.registerField('foo', () => {})
    form.registerField('foo2', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })

    form.change('foo', 'notbar')
    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: true,
      submitFailed: false
    })
  })

  it('should support synchronous submission with errors via callback', () => {
    const onSubmit = jest.fn((values, form, callback) => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      callback(errors)
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    form.registerField('foo', () => {})
    form.registerField('foo2', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })
    expect(typeof onSubmit.mock.calls[0][1]).toBe('object')
    expect(typeof onSubmit.mock.calls[0][2]).toBe('function')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })

    form.change('foo', 'notbar')
    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(onSubmit.mock.calls[1][0]).toEqual({ foo: 'notbar', foo2: 'baz' })
    expect(typeof onSubmit.mock.calls[1][1]).toBe('object')
    expect(typeof onSubmit.mock.calls[1][2]).toBe('function')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: true,
      submitFailed: false
    })
  })


  it('should reset the modifiedSinceLastSubmit flag after submitting with errors', () => {
    const onSubmit = jest.fn()
    const validate = (values, form, callback) => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors;
    }
    const form = createForm({ onSubmit, validate })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    spy.iAmTheSpySubscriber = true;
    form.subscribe(spy, {
      modifiedSinceLastSubmit: true,
    })
    form.registerField('foo', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: false
    })

    form.change('foo', 'baz')

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'baz' })

    form.change('foo', 'bar')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: true 
    })

    form.submit()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: false 
    })
  })

  it('should support asynchronous submission with errors via callback', async () => {
    const onSubmit = jest.fn((values, form, callback) => {
      setTimeout(() => {
        const errors = {}
        if (values.foo === 'bar') {
          errors.foo = 'Sorry, "bar" is an illegal value'
        }
        callback(errors)
      }, 2) // no need to wait too long!
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    form.registerField('foo', () => {})
    form.registerField('foo2', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()

    await form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })

    form.change('foo', 'notbar')
    const promise = form.submit()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    await promise

    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(onSubmit.mock.calls[1][0]).toEqual({ foo: 'notbar', foo2: 'baz' })

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: true,
      submitFailed: false
    })
  })

  it('should support asynchronous submission with errors via promise', async () => {
    const onSubmit = jest.fn(async values => {
      await sleep(2) // no need to wait too long!
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    form.registerField('foo', () => {})
    form.registerField('foo2', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()

    const result = await form.submit()
    expect(result).toBeDefined()
    expect(result).toEqual({ foo: 'Sorry, "bar" is an illegal value' })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })

    form.change('foo', 'notbar')
    const promise = form.submit()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })

    await promise

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: true,
      submitFailed: false
    })
  })

  it('should mark all fields as touched on submit that returns submit errors', () => {
    // https://github.com/final-form/react-final-form/issues/186
    const form = createForm({
      onSubmit: () => ({ username: 'Invalid username' }),
      validate: values => {
        const errors = {}
        if (!values.password) {
          errors.password = 'Required'
        }
        return errors
      }
    })
    const username = jest.fn()
    form.registerField('username', username, { touched: true })
    expect(username).toHaveBeenCalled()
    expect(username).toHaveBeenCalledTimes(1)
    expect(username.mock.calls[0][0].touched).toBe(false)
    const password = jest.fn()
    form.registerField('password', password, { touched: true })
    expect(password).toHaveBeenCalled()
    expect(password).toHaveBeenCalledTimes(1)
    expect(password.mock.calls[0][0].touched).toBe(false)

    form.change('password', 'finalformrocks')
    form.submit()

    expect(username).toHaveBeenCalledTimes(2)
    expect(username.mock.calls[1][0].touched).toBe(true)
    expect(password).toHaveBeenCalledTimes(2)
    expect(password.mock.calls[1][0].touched).toBe(true)
  })

  it('should clear submission flags and errors on reset', () => {
    const onSubmit = jest.fn((values, form) => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      dirtySinceLastSubmit: true,
      modifiedSinceLastSubmit: true,
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({
      dirtySinceLastSubmit: false,
      modifiedSinceLastSubmit: false,
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })
    const foo = jest.fn()
    form.registerField('foo', foo, { submitError: true, valid: true })
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        submitError: undefined,
        valid: true
      })
    )

    form.change('foo', 'bar')
    expect(spy).toHaveBeenCalledTimes(1)

    form.submit()

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0]).toEqual({
      dirtySinceLastSubmit: false,
      modifiedSinceLastSubmit: false,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        submitError: 'Sorry, "bar" is an illegal value',
        valid: false
      })
    )

    form.reset()

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0]).toEqual({
      dirtySinceLastSubmit: false,
      modifiedSinceLastSubmit: false,
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })
    expect(foo).toHaveBeenCalledTimes(3)
    expect(foo.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        submitError: undefined,
        valid: true
      })
    )
  })

  it('should clear submitError & submitErrors when submit gets called', async () => {
    const onSubmit = async values => {
      await sleep(2)

      if (!('email' in values)) {
        return {
          [FORM_ERROR]: 'Please fill all fields.'
        }
      }

      if (!values.email.includes('@')) {
        return {
          email: 'Email must be valid.'
        }
      }
    }
    const form = createForm({ onSubmit })

    const formSpy = jest.fn()
    form.subscribe(formSpy, {
      submitting: true,
      submitError: true,
      submitErrors: true,
      submitFailed: true,
      submitSucceeded: true
    })
    expect(last(formSpy.mock.calls)[0]).toMatchInlineSnapshot(`
      Object {
        "submitError": undefined,
        "submitErrors": undefined,
        "submitFailed": false,
        "submitSucceeded": false,
        "submitting": false,
      }
    `)

    await form.submit()
    expect(last(formSpy.mock.calls)[0]).toMatchInlineSnapshot(`
      Object {
        "submitError": "Please fill all fields.",
        "submitErrors": Object {
          "FINAL_FORM/form-error": "Please fill all fields.",
        },
        "submitFailed": true,
        "submitSucceeded": false,
        "submitting": false,
      }
    `)

    const emailSpy = jest.fn()
    form.registerField('email', emailSpy, { submitError: true })
    expect({ submitError: last(emailSpy.mock.calls)[0].submitError })
      .toMatchInlineSnapshot(`
        Object {
          "submitError": undefined,
        }
      `)

    form.change('email', 'erik')
    let submissionPromise = form.submit()
    expect(last(formSpy.mock.calls)[0]).toMatchInlineSnapshot(`
      Object {
        "submitError": undefined,
        "submitErrors": undefined,
        "submitFailed": false,
        "submitSucceeded": false,
        "submitting": true,
      }
    `)

    await submissionPromise
    expect(last(formSpy.mock.calls)[0]).toMatchInlineSnapshot(`
      Object {
        "submitError": undefined,
        "submitErrors": Object {
          "email": "Email must be valid.",
        },
        "submitFailed": true,
        "submitSucceeded": false,
        "submitting": false,
      }
    `)
    expect({ submitError: last(emailSpy.mock.calls)[0].submitError })
      .toMatchInlineSnapshot(`
        Object {
          "submitError": "Email must be valid.",
        }
      `)

    form.change('email', 'erikr@s')
    submissionPromise = form.submit()
    expect(last(formSpy.mock.calls)[0]).toMatchInlineSnapshot(`
      Object {
        "submitError": undefined,
        "submitErrors": undefined,
        "submitFailed": false,
        "submitSucceeded": false,
        "submitting": true,
      }
    `)
    expect({ submitError: last(emailSpy.mock.calls)[0].submitError })
      .toMatchInlineSnapshot(`
        Object {
          "submitError": undefined,
        }
      `)

    await submissionPromise
  })

  it('should clear submitError & submitErrors when submit gets called, but validation fails', () => {
    const submitErrorText = 'You shall not pass'
    const fooSubmitErrorText = 'Foo shall not pass'

    const form = createForm({
      onSubmit: () => ({
        [FORM_ERROR]: submitErrorText,
        foo: fooSubmitErrorText,
      }),
      initialValues: { foo: 'bar' },
      validate: values => {
        const errors = {};
        if (values.foo !== 'bar') {
          errors.foo = 'Sorry, only "bar" can pass this step';
        }
        return errors;
      },
    })
    form.registerField('foo', () => {})

    const spy = jest.fn()
    form.subscribe(spy, {
      submitError: true,
      submitErrors: true,
    })

    form.submit()

    expect(spy).toHaveBeenLastCalledWith({
      submitError: submitErrorText,
      submitErrors: {
        [FORM_ERROR]: submitErrorText,
        foo: fooSubmitErrorText,
      },
    })

    form.change('foo', 'baz')
    form.submit()

    expect(spy).toHaveBeenLastCalledWith({
      submitError: undefined,
      submitErrors: undefined,
    })
  })

  it('should maintain field-level and form-level dirtySinceLastSubmit', () => {
    const onSubmit = jest.fn((values, form) => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      dirtySinceLastSubmit: true,
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    const foo = jest.fn()
    const foo2 = jest.fn()
    form.registerField('foo', foo, { dirtySinceLastSubmit: true })
    form.registerField('foo2', foo2, { dirtySinceLastSubmit: true })

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      dirtySinceLastSubmit: false,
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].dirtySinceLastSubmit).toBe(false)

    expect(foo2).toHaveBeenCalled()
    expect(foo2).toHaveBeenCalledTimes(1)
    expect(foo2.mock.calls[0][0].dirtySinceLastSubmit).toBe(false)

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo2).toHaveBeenCalledTimes(1)

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })
    expect(typeof onSubmit.mock.calls[0][1]).toBe('object')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      dirtySinceLastSubmit: false,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo2).toHaveBeenCalledTimes(1)

    form.change('foo', 'notbar')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      dirtySinceLastSubmit: true,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].dirtySinceLastSubmit).toBe(true)
    expect(foo2).toHaveBeenCalledTimes(1)

    // change back to bar
    form.change('foo', 'bar')

    expect(spy).toHaveBeenCalledTimes(4)
    expect(spy).toHaveBeenCalledWith({
      dirtySinceLastSubmit: false,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(3)
    expect(foo.mock.calls[2][0].dirtySinceLastSubmit).toBe(false)
    expect(foo2).toHaveBeenCalledTimes(1)

    // change foo2
    form.change('foo2', 'bazzy')

    expect(spy).toHaveBeenCalledTimes(5)
    expect(spy).toHaveBeenCalledWith({
      dirtySinceLastSubmit: true,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(3)
    expect(foo2).toHaveBeenCalledTimes(2)
    expect(foo2.mock.calls[1][0].dirtySinceLastSubmit).toBe(true)
  })

  it('should maintain field-level and form-level modifiedSinceLastSubmit', () => {
    const onSubmit = jest.fn((values, form) => {
      const errors = {}
      if (values.foo === 'bar') {
        errors.foo = 'Sorry, "bar" is an illegal value'
      }
      return errors
    })
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    expect(spy).not.toHaveBeenCalled()
    form.subscribe(spy, {
      modifiedSinceLastSubmit: true,
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    const foo = jest.fn()
    const foo2 = jest.fn()
    form.registerField('foo', foo, { modifiedSinceLastSubmit: true })
    form.registerField('foo2', foo2, { modifiedSinceLastSubmit: true })

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: false,
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })
    expect(foo).toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo.mock.calls[0][0].modifiedSinceLastSubmit).toBe(false)

    expect(foo2).toHaveBeenCalled()
    expect(foo2).toHaveBeenCalledTimes(1)
    expect(foo2.mock.calls[0][0].modifiedSinceLastSubmit).toBe(false)

    form.change('foo', 'bar')
    form.change('foo2', 'baz')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo2).toHaveBeenCalledTimes(1)

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar', foo2: 'baz' })
    expect(typeof onSubmit.mock.calls[0][1]).toBe('object')

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: false,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(1)
    expect(foo2).toHaveBeenCalledTimes(1)

    form.change('foo', 'notbar')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy).toHaveBeenCalledWith({
      modifiedSinceLastSubmit: true,
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo.mock.calls[1][0].modifiedSinceLastSubmit).toBe(true)
    expect(foo2).toHaveBeenCalledTimes(1)

    // change back to bar
    form.change('foo', 'bar')

    expect(spy).toHaveBeenCalledTimes(3)
    expect(foo).toHaveBeenCalledTimes(2)
    expect(foo2).toHaveBeenCalledTimes(1)
  })

  it('should not submit if form is still validating', () => {
    const onSubmit = jest.fn()
    const form = createForm({ onSubmit })

    const username = jest.fn()
    form.registerField(
      'username',
      username,
      { error: true },
      {
        getValidator: () => () => {
          return new Promise(resolve => resolve('Error'))
        }
      }
    )

    form.submit()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should set submitting to true during until promise is resolved, and then set it back to false', async () => {
    const onSubmit = jest.fn(
      () =>
        new Promise(resolve => {
          sleep(5).then(resolve)
        })
    )
    const form = createForm({ onSubmit })
    const formSubscriptionSpy = jest.fn()
    form.subscribe(formSubscriptionSpy, { submitting: true })
    expect(formSubscriptionSpy).toHaveBeenCalled()
    expect(formSubscriptionSpy).toHaveBeenCalledTimes(1)
    expect(formSubscriptionSpy.mock.calls[0][0]).toEqual({ submitting: false })

    const fieldSubscriptionSpy = jest.fn()
    form.registerField('username', fieldSubscriptionSpy, { submitting: true })

    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(formSubscriptionSpy).toHaveBeenCalledTimes(2)
    expect(formSubscriptionSpy.mock.calls[1][0]).toEqual({ submitting: true })
    expect(fieldSubscriptionSpy).toHaveBeenCalledTimes(2)
    expect(fieldSubscriptionSpy.mock.calls[1][0].submitting).toEqual(true)

    await sleep(6)

    expect(formSubscriptionSpy).toHaveBeenCalledTimes(3)
    expect(formSubscriptionSpy.mock.calls[2][0]).toEqual({ submitting: false })
    expect(fieldSubscriptionSpy).toHaveBeenCalledTimes(3)
    expect(fieldSubscriptionSpy.mock.calls[2][0].submitting).toEqual(false)
  })

  it('should set submitting to true during until promise is rejected, and then set it back to false', () => {
    const onSubmit = () =>
      new Promise((resolve, reject) => {
        sleep(5).then(() => {
          reject('No submit for you!')
        })
      })
    const form = createForm({ onSubmit })
    const formSubscriptionSpy = jest.fn()
    form.subscribe(formSubscriptionSpy, { submitting: true })
    expect(formSubscriptionSpy).toHaveBeenCalled()
    expect(formSubscriptionSpy).toHaveBeenCalledTimes(1)
    expect(formSubscriptionSpy.mock.calls[0][0]).toEqual({ submitting: false })

    const fieldSubscriptionSpy = jest.fn()
    form.registerField('username', fieldSubscriptionSpy, { submitting: true })

    form.submit().catch(error => expect(error).toBe('No submit for you!'))
    expect(formSubscriptionSpy).toHaveBeenCalledTimes(2)
    expect(formSubscriptionSpy.mock.calls[1][0]).toEqual({ submitting: true })
    expect(fieldSubscriptionSpy).toHaveBeenCalledTimes(2)
    expect(fieldSubscriptionSpy.mock.calls[1][0].submitting).toEqual(true)

    return sleep(6).then(() => {
      expect(formSubscriptionSpy).toHaveBeenCalledTimes(3)
      expect(formSubscriptionSpy.mock.calls[2][0]).toEqual({
        submitting: false
      })
      expect(fieldSubscriptionSpy).toHaveBeenCalledTimes(3)
      expect(fieldSubscriptionSpy.mock.calls[2][0].submitting).toEqual(false)
    })
  })

  it('should rethrow error on async submit', async () => {
    const spy = jest.fn()
    const onSubmit = async () => {
      await sleep(5)
      throw new Error('No submit for you!')
    }
    const form = createForm({ onSubmit })
    form.subscribe(spy, { submitting: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({ submitting: false })

    form.registerField('username', () => {}, {})

    form
      .submit()
      .catch(error => expect(error.message).toBe('No submit for you!'))
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0]).toEqual({ submitting: true })
    await sleep(10)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0]).toEqual({ submitting: false })
  })

  it('should call beforeSubmit and afterSubmit on all fields', () => {
    const spy = jest.fn()
    const nameBeforeSubmit = jest.fn()
    const nameAfterSubmit = jest.fn()
    const passwordBeforeSubmit = jest.fn()
    const passwordAfterSubmit = jest.fn()

    const onSubmit = () => {
      expect(nameBeforeSubmit).toHaveBeenCalled()
      expect(nameBeforeSubmit).toHaveBeenCalledTimes(1)
      expect(nameAfterSubmit).not.toHaveBeenCalled()
      expect(passwordBeforeSubmit).toHaveBeenCalled()
      expect(passwordBeforeSubmit).toHaveBeenCalledTimes(1)
      expect(passwordAfterSubmit).not.toHaveBeenCalled()
    }
    const form = createForm({ onSubmit })
    form.subscribe(spy, { submitting: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({ submitting: false })

    form.registerField(
      'name',
      () => {},
      {},
      {
        beforeSubmit: nameBeforeSubmit,
        afterSubmit: nameAfterSubmit
      }
    )
    form.registerField(
      'password',
      () => {},
      {},
      {
        beforeSubmit: passwordBeforeSubmit,
        afterSubmit: passwordAfterSubmit
      }
    )
    expect(nameBeforeSubmit).not.toHaveBeenCalled()
    expect(nameAfterSubmit).not.toHaveBeenCalled()
    expect(passwordBeforeSubmit).not.toHaveBeenCalled()
    expect(passwordAfterSubmit).not.toHaveBeenCalled()

    form.submit()

    expect(nameBeforeSubmit).toHaveBeenCalledTimes(1)
    expect(nameAfterSubmit).toHaveBeenCalled()
    expect(nameAfterSubmit).toHaveBeenCalledTimes(1)
    expect(passwordBeforeSubmit).toHaveBeenCalledTimes(1)
    expect(passwordAfterSubmit).toHaveBeenCalled()
    expect(passwordAfterSubmit).toHaveBeenCalledTimes(1)

    // submitting flag doesn't flip for sync submission
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should allow updates in beforeSubmit', () => {
    let beforeSubmit

    const onSubmit = values => {
      expect(beforeSubmit).toHaveBeenCalled()
      expect(beforeSubmit).toHaveBeenCalledTimes(1)
      expect(values.name).toBe('ERIKRAS')
    }
    const form = createForm({ onSubmit })
    beforeSubmit = jest.fn(() => {
      form.change('name', 'ERIKRAS')
    })

    const name = jest.fn()
    form.registerField('name', name, { value: true }, { beforeSubmit })
    expect(beforeSubmit).not.toHaveBeenCalled()
    expect(name).toHaveBeenCalled()
    expect(name).toHaveBeenCalledTimes(1)
    expect(name.mock.calls[0][0].value).toBeUndefined()
    name.mock.calls[0][0].change('erikras')

    expect(name).toHaveBeenCalledTimes(2)
    expect(name.mock.calls[1][0].value).toBe('erikras')

    form.submit()

    expect(name).toHaveBeenCalledTimes(3)
    expect(name.mock.calls[2][0].value).toBe('ERIKRAS')
  })

  it('should call allow submission cancelation via beforeSubmit', () => {
    const spy = jest.fn()
    const nameBeforeSubmit = jest.fn()
    const passwordBeforeSubmit = jest.fn(() => false)
    const emailBeforeSubmit = jest.fn()
    const onSubmit = jest.fn()

    const form = createForm({ onSubmit })
    form.subscribe(spy, { submitting: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({ submitting: false })

    form.registerField(
      'name',
      () => {},
      {},
      {
        beforeSubmit: nameBeforeSubmit
      }
    )
    form.registerField(
      'password',
      () => {},
      {},
      {
        beforeSubmit: passwordBeforeSubmit
      }
    )
    form.registerField(
      'email',
      () => {},
      {},
      {
        beforeSubmit: emailBeforeSubmit
      }
    )
    expect(nameBeforeSubmit).not.toHaveBeenCalled()
    expect(passwordBeforeSubmit).not.toHaveBeenCalled()
    expect(emailBeforeSubmit).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()

    form.submit()

    expect(nameBeforeSubmit).toHaveBeenCalled()
    expect(passwordBeforeSubmit).toHaveBeenCalled()

    // it short-circuited because password returned false,
    // so it didn't even need to call email's before submit
    expect(emailBeforeSubmit).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should not call onSubmit while already submitting', async () => {
    let resolve
    const onSubmit = jest.fn(() => {
      return new Promise(_resolve => {
        resolve = _resolve
      })
    })

    const form = createForm({ onSubmit })

    const submissionPromise = form.submit()

    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledTimes(1)

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)

    resolve()
    await submissionPromise

    form.submit()
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('should allow reset in onSubmit', async () => {
    const onSubmit = (values, form) => {
      form.reset()
      form.change('foo', 'bar');
    }

    const form = createForm({ onSubmit })
    const field = jest.fn()
    form.registerField('foo', field, { submitSucceeded: true, value: true })
    expect(field).toHaveBeenCalled()
    expect(field).toHaveBeenCalledTimes(1)
    expect(field.mock.calls[0][0].submitSucceeded).toBe(false)
    expect(field.mock.calls[0][0].value).toBeUndefined()
    field.mock.calls[0][0].change('bar')
    expect(field).toHaveBeenCalledTimes(2)
    expect(field.mock.calls[1][0].value).toBe('bar')

    await form.submit()
    expect(field).toHaveBeenCalledTimes(4)
    expect(field.mock.calls[2][0].submitSucceeded).toBe(false)
    expect(field.mock.calls[2][0].value).toBeUndefined()
    expect(field.mock.calls[3][0].value).toBe('bar')
    await sleep(1)
    expect(field).toHaveBeenCalledTimes(4)
  })

  it('should allow setTimeout(reset) in onSubmit', async () => {
    const onSubmit = async (values, form) => {
      await sleep(2)
      setTimeout(form.reset)
    }

    const form = createForm({ onSubmit })
    const field = jest.fn()
    form.registerField('foo', field, { submitSucceeded: true, value: true })
    expect(field).toHaveBeenCalled()
    expect(field).toHaveBeenCalledTimes(1)
    expect(field.mock.calls[0][0].submitSucceeded).toBe(false)
    expect(field.mock.calls[0][0].value).toBeUndefined()
    field.mock.calls[0][0].change('bar')
    expect(field).toHaveBeenCalledTimes(2)
    expect(field.mock.calls[1][0].value).toBe('bar')

    await form.submit()
    expect(field).toHaveBeenCalledTimes(3)
    expect(field.mock.calls[2][0].submitSucceeded).toBe(true)
    await sleep(1)
    expect(field).toHaveBeenCalledTimes(4)
    expect(field.mock.calls[3][0].submitSucceeded).toBe(false)
  })

  it('should allow Error object as error value', () => {
    const onSubmit = jest.fn(values => ({
      foo: Error('Sorry, "bar" is an illegal value')
    }))
    const form = createForm({ onSubmit })
    const spy = jest.fn()
    form.subscribe(spy, {
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    form.registerField('foo', () => {})

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith({
      valid: true,
      submitSucceeded: false,
      submitFailed: false
    })

    form.change('foo', 'bar')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()

    form.submit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toEqual({ foo: 'bar' })

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({
      valid: false,
      submitSucceeded: false,
      submitFailed: true
    })
  })

  describe('async validation error', () => {
    it('should log an error if async validation throw an error and do not freeze', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const onSubmit = jest.fn()
      const validationError = new Error('uh oh error during validation')
      const form = createForm({
        onSubmit,
        validate: async values => {
          throw validationError
        }
      })
      form.registerField('foo', () => {})
      form.registerField('foo2', () => {})

      form.change('foo', 'bar')
      form.change('foo2', 'baz')

      expect(onSubmit).not.toHaveBeenCalled()
      form.submit()
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onSubmit).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith(validationError)
      console.error.mockRestore()
    })
  })
})
