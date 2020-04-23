
# Owl 2.0

Exported values:

owl
    setup
        addTemplate
        addComponent
        addStyleSheet
        addTranslateFunction

    utils
        renderToString
    
    mount
    render
    Component
    browser
    hooks
      useState

```js

class App extends Component {
    ...
}

// or

function App(env, props) {
    return () => render(template, {...})
}


await mount(App, {target: document.body, position: "", env, props: ...})

```


Files:

- scheduler.ts
- core
- fiber
- vdom
- qweb
- types



=============================================

Fiber
MountingFiber

compiledTemplate: (fiber, context) => VNode (sync, but not complete vnode)


=============================================
Example: <div>Hello <t t-esc="name"/></div>
  fn: (context: RenderContext) => {
    const vn0 = {type: NodeType.Content, children: []};
    const vn1 = {type: NodeType.DOM, tag: 'div', el: null, children: []};
    vn0.children.push(vn1);
    const vn2 = {type: NodeType.Text, text: 'Hello ', el: null};
    vn1.children.push(vn2);
    const vn3 = {type: NodeType.Text, text: context.name, el: null};
    vn1.children.push(vn3);
    return vn0;

=============================================
Example: <div>Hello <MyComponent a="name"/></div>

  fn: (context: RenderContext) => {
    const vn0 = {type: NodeType.Content, children: []};
    const vn1 = {type: NodeType.DOM, tag: 'div', el: null, children: []};
    vn0.children.push(vn1);
    const vn2 = {type: NodeType.Text, text: 'Hello ', el: null};
    vn1.children.push(vn2);
    const vn3 = componentNode(fiber, 'MyComponent', {a: context.name});
    vn1.children.push(vn3);
    return vn0;

=============================================

- vdom (vdom structure, patch and update methods)
- qweb (template engine)