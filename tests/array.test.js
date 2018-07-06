import { expect } from 'chai';

import ArrayType from '../src/array';
import { create, Meta } from '../src/picostates';

describe("ArrayType", function() {
  describe("when unparameterized", function() {
    let ms;
    let array = ["a", "b", "c"];

    beforeEach(() => {
      ms = create(ArrayType, array);
    });

    describe("push", () => {
      let pushed;
      beforeEach(() => {
        pushed = ms.push("d");
      });

      it("has state", () => {
        expect(pushed.state).to.deep.equal(["a", "b", "c", "d"]);
      });

      describe("again", () => {
        let again;

        beforeEach(() => {
          again = pushed.push("e");
        });

        it("has state", () => {
          expect(again.state).to.deep.equal(["a", "b", "c", "d", "e"]);
        });
      });
    });

    describe("filter", () => {
      let filtered;

      beforeEach(() => {
        filtered = ms.filter(v => v.state !== "a");
      });

      it("state", () => {
        expect(filtered.state).to.deep.equal(["b", "c"]);
      });
    });

    describe("map", () => {
      let mapped;

      beforeEach(() => {
        mapped = ms.map(v => v.state.toUpperCase());
      });

      it("state", () => {
        expect(mapped.state).to.deep.equal(["A", "B", "C"]);
      });
    });
  });

  describe("when parameterized", () => {
    class Record {
      content = create(class StringType {
        concat(value) {
          return String(this.state) + String(value);
        }
      });
    }
    class Dataset {
      records = create(ArrayType.of(Record), []);
    }

    describe('empty data set', () => {
      let dataset;
      beforeEach(() => {
        dataset = create(Dataset, { records: [] });
      });

      describe("pushing a record", () => {
        let pushed;
        beforeEach(() => {
          pushed = dataset.records.push({ content: "Hi!" });
        });

        it("has the new record", () => {
          expect(pushed.records[0]).to.be.instanceof(Record);
        });

        it("has given value", () => {
          expect(pushed.state.records[0].content).to.equal("Hi!");
        });

        describe("changing record", () => {
          let changed;
          beforeEach(() => {
            changed = pushed.records[0].content.set("Hello!");
          });

          it("has changed value", () => {
            expect(changed.state.records[0].content).to.equal("Hello!");
          });
        });
      });
    });

    describe('preloaded data set', () => {
      let dataset;
      beforeEach(() => {
        dataset = create(Dataset, { records: [
          {content: 'Herro'},
          {content: 'Sweet'},
          {content: "Woooo"}
        ]});
      });

      describe("push", () => {
        let pushed;
        beforeEach(() => {
          pushed = dataset.records.push({ content: "Hi!" });
        });

        it("has the new record", () => {
          expect(pushed.records[3]).to.be.instanceof(Record);
        });

        it("has given value", () => {
          expect(pushed.state.records[3].content).to.equal("Hi!");
        });

        describe("changing record", () => {
          let changed;
          beforeEach(() => {
            changed = pushed.records[3].content.set("Hello!");
          });

          it("has changed value", () => {
            expect(changed.state.records[3].content).to.equal("Hello!");
          });
        });
      });

      describe('shift', () => {
        let shifted;
        beforeEach(() => {
          shifted = dataset.records.shift();
        });

        it('removed first element from the array', () => {
          expect(shifted.records[0].content.state).to.equal('Sweet');
        });

        it('changed length', () => {
          expect(shifted.records.state.length).to.equal(2);
        });

        describe('changing record', () => {
          let changed;
          beforeEach(() => {
            changed = shifted.records[1].content.concat('!!!');
          });

          it('changed the content', () => {
            expect(changed.records[1].content.state).to.equal('Woooo!!!');
          });
        });
      });

      describe('unshift', () => {
        let unshifted;
        beforeEach(() => {
          unshifted = dataset.records.unshift({ content: "Hi!" });
        });
        it('pushed record to the beginning of the array', () => {
          expect(unshifted.records[0].content.state).to.equal('Hi!');
        });
        it('moved first record to second position', () => {
          expect(unshifted.records[1].content.state).to.equal('Herro');
        });

        describe('change new record', () => {
          let changed;
          beforeEach(() => {
            changed = unshifted.records[0].content.concat('!!!');
          });
          it('changed new record', () => {
            expect(changed.records[0].content.state).to.equal('Hi!!!!');
          });
        });

        describe('change existing record', () => {
          let changed;
          beforeEach(() => {
            changed = unshifted.records[1].content.concat('!!!');
          });
          it('changed new record', () => {
            expect(changed.records[1].content.state).to.equal('Herro!!!');
          });
        });
      });

      describe('filter', () => {
        let filtered;
        beforeEach(() => {
          filtered = dataset.records.filter(record => record.state.content[0] === 'S');
        });

        it('filtered out items', () => {
          expect(filtered.records.state.length).to.equal(1);
        });

        describe('changing remaining item', () => {
          let changed;
          beforeEach(() => {
            changed = filtered.records[0].content.concat('!!!');
          });

          it('it changed the state', () => {
            expect(changed.records[0].content.state).to.equal('Sweet!!!');
          });
        });
      });

      describe('map', () => {
        describe('with microstate operations', () => {
          let mapped;
          beforeEach(() => {
            mapped = dataset.records.map(record => record.content.concat('!!!'))
          });

          it('applied change to every element', () => {
            expect(mapped.records[0].content.state).to.equal('Herro!!!');
            expect(mapped.records[1].content.state).to.equal('Sweet!!!');
            expect(mapped.records[2].content.state).to.equal('Woooo!!!');
          });

          describe('changing record', () => {
            let changed;
            beforeEach(() => {
              changed = mapped.records[1].content.set('SWEET!!!');
            });

            it('changed the record content', () => {
              expect(changed.records[1].content.state).to.equal('SWEET!!!');
            });
          });
        });

        describe('with new microstates', () => {
          let mapped;
          class SweetSweetRecord extends Record {}
          beforeEach(() => {
            mapped = dataset.records.map(record => {
              if (record.content.state === 'Sweet') {
                return create(SweetSweetRecord, record);
              } else {
                return record;
              }
            });
          });

          it('changed type of the record', () => {
            expect(mapped.records[1]).to.be.instanceof(SweetSweetRecord);
          });

          it('did not change the uneffected item', () => {
            expect(dataset.records[0].state).to.equal(mapped.records[0].state);
            expect(dataset.records[2].state).to.equal(mapped.records[2].state);
          });
        });
      });

      describe('clear', () => {
        let cleared;
        beforeEach(() => {
          cleared = dataset.records.clear();
        });

        it('makes array empty', () => {
          expect(cleared.records.state).to.deep.equal([]);
        });

        it('has empty value', () => {
          expect(cleared.state).to.deep.equal({ records: [] });
        });
      });

    });

  });
});
