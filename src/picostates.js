import { append, filter, foldl, Semigroup, map, stable, type } from 'funcadelic';
import { view, set, over, Lens } from './lens';

export const Picostate = type(class {
  assemble(Type, picostate, value) {
    return this(picostate).assemble(Type, picostate, value);
  }
})

const { assemble } = Picostate.prototype;

Picostate.instance(Object, {
  assemble(Type, picostate, value) {
    return foldl((picostate, { key, value: child }) => {
      let substate = value != null && value[key] != null ? child.set(value[key]) : child;
      return set(SubstateAt(key), substate, picostate);
    }, picostate, new Type());
  }
})

export function create(Type = Any, value) {
  let PicoType = toPicoType(Type);
  let instance = new PicoType();
  instance.state = value
  let picostate = assemble(Type, instance, value);

  if (Type.prototype.hasOwnProperty('initialize') && typeof picostate.initialize === 'function') {
    return picostate.initialize(value);
  } else {
    return picostate;
  }
}

const toPicoType = stable(function toPicoType(Type) {
  if (Type.isPicostateType) {
    return Type;
  }
  let PicoType = class extends Type {
    static get name() {
      return `Picostate<${Type.name}>`;
    }
    static isPicostateType = true;

    set(value) {
      let microstate
      if (value === this.state) {
        microstate = this;
      } else if (isPicostate(value)) {
        microstate = value;
      } else {
        microstate = create(this.constructor, value);
      }
      let meta = Meta.get(this);

      if (meta.parent) {
        return meta.parent.set(set(ValueAt(meta.name), microstate.state, meta.parent.state));
      } else {
        return microstate;
      }
    }
  }
  let descriptors = Object.getOwnPropertyDescriptors(Type.prototype);
  let methods = Object.keys(descriptors).reduce((methods, name) => {
    let desc = descriptors[name];
    if (name !== 'constructor' && name !== 'set' && typeof name === 'string' && typeof desc.value === 'function') {
      return methods.concat(name);
    } else {
      return methods;
    }
  }, []);

  Object.assign(PicoType.prototype, foldl((methods, name) =>  {
    methods[name] = function(...args) {
      let method = Type.prototype[name];
      let meta = Meta.get(this);
      let result = method.apply(meta.source || this, args);
      return this.set(result);
    }
    return methods;
  }, {}, methods))
  return PicoType;
});

function isPicostate(value) {
  return value != null && value.constructor.isPicostateType;
}

export class Any { }

export class Meta {

  static get(object) {
    if (object == null) {
      throw new Error('cannot lookup Meta of null or undefined');
    }
    return view(Meta.lens, object);
  }

  static source(picostate) {
    return Meta.get(picostate).source || picostate;
  }

  static map(fn, object) {
    return over(Meta.lens, meta => append(meta, fn(meta)), object);
  }

  static lookup(object) {
    return object[Meta.LOOKUP] || new Meta({ context: object });
  }

  static LOOKUP = Symbol('Meta');

  static lens = Lens(Meta.lookup, (meta, object) => {
    if (meta === object[Meta.LOOKUP]) {
      return object;
    } else {
      let clone = Semigroup.for(Object).append(object, {});
      clone[Meta.LOOKUP] = meta;
      return clone;
    }
  })
}

export function ValueAt(property) {
  let get = context => context != null ? context[property] : undefined;
  let set = (value, context = {}) => {
    if (value === context[property]) {
      return context;
    } else if (Array.isArray(context)) {
      let clone = context.slice();
      clone[Number(property)] = value;
      return clone;
    } else {
      return Semigroup.for(Object).append(context, {[property]: value});
    }
  };

  return Lens(get, set);
}

export function SubstateAt(name) {
  let getter = context => {
    if (context == null || context[name] == null) {
      return undefined;
    } else {
      return Meta.get(context[name]).source;
    }
  }

  let setter = (substate, picostate) => {
    let current = picostate[name];
    let { source } = current ? Meta.get(current) : {};
    if (substate === source) {
      return picostate;
    } else {

      function recontextualize(name, childPicostate, parentFn) {
        let children = map((child, name) => isPicostate(child) ? recontextualize(name, child, () => contextualized) : child, childPicostate);
        let contextualized = append(Meta.map(() => ({ name, source: childPicostate, get parent() { return parentFn() } }), childPicostate), children);
        return contextualized;
      }

      let next = append(picostate, {
        [name]: recontextualize(name, substate, () => next),
        state: set(ValueAt(name), substate.state, picostate.state)
      });
      return next;
    }
  };

  return Lens(getter, setter);
}

export function parameterized(fn) {

  function initialize(...args) {
    let Type = fn(...args);
    if (Type.initialize) {
      Type.initialize();
    }
    return Type;
  }

  let defaultTypeParameters = new Array(fn.length);
  defaultTypeParameters.fill(Any);
  let DefaultType = initialize(...defaultTypeParameters);
  DefaultType.of = (...args) => initialize(...args);
  return DefaultType;
}
