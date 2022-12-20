# Babel Plugin JSX for Kdu 3.0

To add Kdu JSX support.

## Installation

Install the plugin with:

```bash
npm install @kdujs/babel-plugin-jsx -D
```

Then add the plugin to your babel config:

```json
{
  "plugins": ["@kdujs/babel-plugin-jsx"]
}
```

## Usage

### options

#### transformOn

Type: `boolean`

Default: `false`

transform `on: { click: xx }` to `onClick: xxx`

#### optimize

Type: `boolean`

Default: `false`

enable optimization or not. It's not recommended to enable it If you are not familiar with Kdu 3.

#### isCustomElement

Type: `(tag: string) => boolean`

Default: `undefined`

configuring custom elements

#### mergeProps

Type: `boolean`

Default: `true`

merge static and dynamic class / style attributes / onXXX handlers

#### enableObjectSlots

Type: `boolean`

Default: `true`

Whether to enable `object slots` (mentioned below the document) syntax". It might be useful in JSX, but it will add a lot of `_isSlot` condition expressions which increase your bundle size. And `k-slots` is still available even if `enableObjectSlots` is turned off.

#### pragma

Type: `string`

Default: `createKNode`

Replace the function used when compiling JSX expressions.

## Syntax

### Content

functional component

```jsx
const App = () => <div>Kdu 3.0</div>;
```

with render

```jsx
const App = {
  render() {
    return <div>Kdu 3.0</div>;
  },
};
```

```jsx
import { withModifiers, defineComponent } from "kdu";

const App = defineComponent({
  setup() {
    const count = ref(0);

    const inc = () => {
      count.value++;
    };

    return () => (
      <div onClick={withModifiers(inc, ["self"])}>{count.value}</div>
    );
  },
});
```

Fragment

```jsx
const App = () => (
  <>
    <span>I'm</span>
    <span>Fragment</span>
  </>
);
```

### Attributes / Props

```jsx
const App = () => <input type="email" />;
```

with a dynamic binding:

```jsx
const placeholderText = "email";
const App = () => <input type="email" placeholder={placeholderText} />;
```

### Directives

#### k-show

```jsx
const App = {
  data() {
    return { visible: true };
  },
  render() {
    return <input k-show={this.visible} />;
  },
};
```

#### k-model

> Note: You should pass the second param as string for using `arg`.

```jsx
<input k-model={val} />
```

```jsx
<input k-model:argument={val} />
```

```jsx
<input k-model={[val, ["modifier"]]} />
```

```jsx
<A k-model={[val, "argument", ["modifier"]]} />
```

Will compile to:

```js
h(A, {
  argument: val,
  argumentModifiers: {
    modifier: true,
  },
  "onUpdate:argument": ($event) => (val = $event),
});
```

#### k-models (Not recommended since v1.1.0)

> Note: You should pass a Two-dimensional Arrays to k-models.

```jsx
<A k-models={[[foo], [bar, "bar"]]} />
```

```jsx
<A
  k-models={[
    [foo, "foo"],
    [bar, "bar"],
  ]}
/>
```

```jsx
<A
  k-models={[
    [foo, ["modifier"]],
    [bar, "bar", ["modifier"]],
  ]}
/>
```

Will compile to:

```js
h(A, {
  modelValue: foo,
  modelModifiers: {
    modifier: true,
  },
  "onUpdate:modelValue": ($event) => (foo = $event),
  bar: bar,
  barModifiers: {
    modifier: true,
  },
  "onUpdate:bar": ($event) => (bar = $event),
});
```

#### custom directive

Recommended when using string arguments

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => <a k-custom:arg={val} />;
  },
};
```

```jsx
const App = {
  directives: { custom: customDirective },
  setup() {
    return () => <a k-custom={[val, "arg", ["a", "b"]]} />;
  },
};
```

### Slot

> Note: In `jsx`, _`k-slot`_ should be replace with **`k-slots`**

```jsx
const A = (props, { slots }) => (
  <>
    <h1>{ slots.default ? slots.default() : 'foo' }</h1>
    <h2>{ slots.bar?.() }</h2>
  </>
);

const App = {
  setup() {
    const slots = {
      bar: () => <span>B</span>,
    };
    return () => (
      <A k-slots={slots}>
        <div>A</div>
      </A>
    );
  },
};

// or

const App = {
  setup() {
    const slots = {
      default: () => <div>A</div>,
      bar: () => <span>B</span>,
    };
    return () => <A k-slots={slots} />;
  },
};

// or you can use object slots when `enableObjectSlots` is not false.
const App = {
  setup() {
    return () => (
      <>
        <A>
          {{
            default: () => <div>A</div>,
            bar: () => <span>B</span>,
          }}
        </A>
        <B>{() => "foo"}</B>
      </>
    );
  },
};
```

### In TypeScript

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

## Compatibility

This repo is only compatible with:

- **Babel 7+**
- **Kdu 3+**
