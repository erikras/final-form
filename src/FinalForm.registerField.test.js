import createForm from './FinalForm'

const onSubmitMock = (values, callback) => {}

describe('FinalForm.registerField', () => {
  it('should fix up field that is created by mutators', () => {
    const form = createForm({
      onSubmit: onSubmitMock,
      initialValues: {
        foo: 'bar'
      },
      mutators: {
        setFieldState: (args, state) => {
          state.fields.foo = {
            active: false,
            afterSubmit: undefined,
            beforeSubmit: undefined,
            data: {},
            isEqual: (a, b) => a === b,
            lastFieldState: undefined,
            modified: true,
            modifiedSinceLastSubmit: false,
            name: 'foo',
            touched: true,
            valid: true,
            validateFields: undefined,
            validators: {},
            validating: false,
            visited: true
          }
        }
      }
    })
    form.mutators.setFieldState()
    const spy = jest.fn()
    form.registerField('foo', spy, { value: true })
    expect(typeof spy.mock.calls[0][0].blur).toBe('function')
    expect(typeof spy.mock.calls[0][0].focus).toBe('function')
    expect(typeof spy.mock.calls[0][0].change).toBe('function')
  })
})
