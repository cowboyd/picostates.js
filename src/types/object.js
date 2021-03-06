import { Assemble } from '../assemble';
import { SubstateAt, create } from '../picostates';
import { over } from '../lens';
import { append, filter, foldl } from 'funcadelic';
import parameterized from '../parameterized'

export default parameterized(T => class ObjectType {
  static T = T;

  static initialize() {
    Assemble.instance(ObjectType, {
      assemble(Type, picostate, value) {
        if (value == null) {
          picostate.state = {};
        }
        return foldl((picostate, entry) => {
          return over(SubstateAt(entry.key), () => create(T).set(entry.value), picostate );
        }, picostate, picostate.state);
      }
    });
  }

  assign(attrs) {
    return append(this.state, attrs);
  }

  put(name, value) {
    return this.assign({[name]: value});
  }

  delete(name) {
    return filter(({ key }) => key !== name, this.state);
  }
});
