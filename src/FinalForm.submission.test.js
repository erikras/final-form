import createForm from './FinalForm'

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
      valid: true,
      submitSucceeded: true,
      submitFailed: true
    })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({
      dirtySinceLastSubmit: false,
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
    const spy = jest.fn()
    form.subscribe(spy, { submitting: true })
    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual({ submitting: false })

    form.registerField('username', () => {}, {})

    expect(onSubmit).not.toHaveBeenCalled()
    form.submit()
    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[1][0]).toEqual({ submitting: true })

    await sleep(6)

    expect(spy).toHaveBeenCalledTimes(3)
    expect(spy.mock.calls[2][0]).toEqual({ submitting: false })
  })

  it('should set submitting to true during until promise is rejected, and then set it back to false', () => {
    try {
      const onSubmit = () =>
        new Promise((resolve, reject) => {
          sleep(5).then(() => {
            debugger
            reject('No submit for you!')
          })
        })
      const form = createForm({ onSubmit })
      const spy = jest.fn()
      form.subscribe(spy, { submitting: true })
      expect(spy).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toEqual({ submitting: false })

      form.registerField('username', () => {}, {})

      form.submit()
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy.mock.calls[1][0]).toEqual({ submitting: true })

      return sleep(6).then(() => {
        expect(spy).toHaveBeenCalledTimes(3)
        expect(spy.mock.calls[2][0]).toEqual({ submitting: false })
      })
    } catch (error) {
      console.error('here', error)
    }
  })
})
