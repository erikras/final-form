# This documentation is meant to be read on [final-form.org](https://final-form.org/docs/final-form/types/FormApi). Links may not work on Github.com.

# `FormApi`

The following items exist on the object returned by [`createForm()`](../api#createform)

## `batch`

```ts
(fn: () => void) => void
```

Allows batch updates by silencing notifications while the `fn` is running.
Example:

```ts
form.batch(() => {
  form.change('firstName', 'Erik') // listeners not notified
  form.change('lastName', 'Rasmussen') // listeners not notified
}) // NOW all listeners notified
```

## `blur`

```ts
(name: string) => void
```

Blurs (marks inactive) the given field.

## `change`

```ts
(name: string, value: any) => void
```

Changes the value of the given field.

## `destroyOnUnregister`

```ts
boolean
```

A read/write property to get and set the `destroyOnUnregister` config setting.

## `focus`

```ts
(name: string) => void
```

Focuses (marks active) the given field.

## `getFieldState`

```ts
(field: string) => ?FieldState
```

Returns the state of a specific field, of type [`FieldState`](FieldState), as it was last reported to its listeners, or `undefined` if the field has not been registered.

## `getRegisteredFields`

```ts
() => string[]
```

Returns a list of all the currently registered fields.

## `getState`

<!-- prettier-ignore -->
```ts
() => FormState
```

A way to request the current state of the form without subscribing.

## `initialize`

```ts
(data: FormValues | ((values: FormValues) => Object)) => void
```

Initializes the form to the values provided. All the values will be set to these
values, and `dirty` and `pristine` will be calculated by performing a
shallow-equals between the current values and the values last initialized with.
The form will be `pristine` after this call.

## `isValidationPaused`

<!-- prettier-ignore -->
```ts
() => boolean
```

Returns `true` if validation is currently paused, `false` otherwise.

## `mutators`

```ts
{ [string]: Function } | void
```

The state-bound versions of the mutators provided to [`Config`](Config#mutators).

## `pauseValidation`

```ts
(preventNotification: boolean = true) => void
```

If called, validation will be paused until `resumeValidation()` is called.

By default, `pauseValidation` also prevents all notifications being fired to their subscribers. This is done performance reasons. However, if notifications are still needed while validation is paused, you can pass `false` to `pauseValidation`.

## `registerField`

```ts
(
  name: string,
  subscriber: FieldState => void,
  subscription: { [string]: boolean },
  config?: FieldConfig
) => Unsubscribe
```

Registers a new field and subscribes to changes to it. **The `subscriber` will _only_ be called, when the values specified in `subscription` change.** More than one subscriber can subscribe to the same field.

This is also where you may provide an optional field-level validation function
that should return `undefined` if the value is valid, or an error. It can
optionally return a `Promise` that _resolves_ (not rejects) to `undefined` or an
error.

Related:

- [`FieldState`](FieldState)
- [`FieldConfig`](FieldConfig)
- [`Unsubscribe`](Unsubscribe)

## `reset`

```ts
(initialValues: ?InitialFormValues) => void
```

Resets the values back to the initial values the form was initialized with. Or empties all the values if the form was not initialized. If you provide `initialValues` they will be used as the new initial values.

Note that if you are calling `reset()` and not specify new initial values, you must call it with no arguments. Be careful to avoid things like `promise.catch(reset)` or `onChange={form.reset}` in React, as they will get arguments passed to them and reinitialize your form.

## `resetFieldState`

```ts
(name: string) => void
```

Resets all of a field's flags (e.g. `touched`, `visited`, etc.) to their initial state.

## `restart`

```ts
(initialValues: ?InitialFormValues) => void
```

Resets all form and field state. Same as calling `reset(initialValues)` on the form and `resetFieldState()` for each field. Form should be just as it was when it was first created.

## `resumeValidation`

```ts
() => void
```

Resumes validation paused by `pauseValidation()`. If validation was blocked while it was paused, validation will be run.

## `submit`

```ts
() => Promise<?Object> | void
```

Submits the form if there are currently no validation errors. It may return
`undefined` or a `Promise` depending on the nature of the `onSubmit`
configuration value given to the form when it was created.

## `subscribe`

<!-- prettier-ignore -->
```ts
(
  subscriber: FormState => void,
  subscription: { [string]: boolean }
) => Unsubscribe
```

Subscribes to changes to the form. **The `subscriber` will _only_ be called when
values specified in `subscription` change.** A form can have many subscribers.

Related:

- [`FormState`](FormState)
- [`Unsubscribe`](Unsubscribe)
