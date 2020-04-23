import { xml } from "../../../tags";

let render: any;
let useState: any;

const template = xml/*xml*/ `
    <div class="greeter" t-on-click="toggle">
      <t t-esc="state.word"/>, <t t-esc="props.name"/>
    </div>`;

const appTemplate = xml/*xml*/ `
    <div>
      Greeter name="state.name"/>
    </div>`;

// -----------------------------------------------------------------------------
// Functional Components
// -----------------------------------------------------------------------------

function Greeter(env) {
  const greeting = useState("Hello"); // stream?
  const toggle = () => greeting(greeting() === "Hi" ? "Hello" : "Hi");

  return (props) => render(template, { greeting, props, toggle });
}

// alternative API
function Greeter(env, props) {
  const greeting = useState("Hello"); // stream?
  const toggle = () => greeting(greeting() === "Hi" ? "Hello" : "Hi");

  return render(template, { greeting, props, toggle });
}

// alternative API 2
function Counter(env, props) {
  let counter = 0; // stream?

  const increment = () => counter++;

  return (props) => render(template, { counter, increment });
}

function App(env) {
  const state = useState({ name: "World" });
  return () => render(appTemplate, { Greeter, state });
}

// alternative API 3
function Counter(env, props) {
  let counter = useState({ value: 0 }); // stream?
  const increment = () => counter.value++;

  return (props) => render(template, { counter, increment });
}

function App(env) {
  const state = useState({ name: "World" });
  return () => render(appTemplate, { Greeter, state });
}

// -----------------------------------------------------------------------------
// Class Components
// -----------------------------------------------------------------------------

class Greeter extends Component {
  static template = template;

  greeting = useState({ word: "hello" });

  toggle() {
    this.state.word = this.state.word === "Hi" ? "Hello" : "Hi";
  }
}

class App extends Component {
  static template = appTemplate;
  state = useState({ name: "World" });
}
