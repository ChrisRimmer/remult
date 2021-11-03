import { Done, testAllDataProviders, TestDataApiResponse, testInMemoryDb, testRestDb, testSql } from './testHelper.spec';
import { WebSqlDataProvider } from '../data-providers/web-sql-data-provider';
import { Remult } from '../context';
import { SqlDatabase } from '../data-providers/sql-database';
import { Categories, CategoriesForTesting } from './remult-3-entities';
import { createData, insertFourRows, testAllDbs } from './RowProvider.spec';
import { ComparisonFilterFactory, ContainsFilterFactory, Entity, EntityBase, Field, FilterFactories, FindOptions, Repository } from '../remult3';
import { InMemoryDataProvider } from '../data-providers/in-memory-database';
import { customUrlToken, Filter } from '../filter/filter-interfaces';
import { RestDataProvider } from '../data-providers/rest-data-provider';
import { DataApi } from '../data-api';

import { ArrayEntityDataProvider } from '../data-providers/array-entity-data-provider';
import { ClassType } from '../../classType';
import { CustomSqlFilterBuilder } from '../filter/filter-consumer-bridge-to-sql-request';


describe("test where stuff", () => {

    let repo: Repository<CategoriesForTesting>;
    beforeAll(async done => {
        [repo] = await insertFourRows();
        done();
    });

    it("test basics", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: x => x.id.isGreaterOrEqualTo(2)
        };
        expect(await repo.count(y => [{ id: { lte: 3 } }, Filter.fromEntityFilter(y, fo.where)])).toBe(2);
        expect(await repo.count(async y => [{ id: { lte: 3 } }, await Filter.fromEntityFilter(y, fo.where)])).toBe(2);
        expect(await repo.count(y => Filter.fromEntityFilter(y, fo.where, { id: { lte: 3 } }))).toBe(2);
        expect(await repo.count(y => [{ id: { lte: 3 } }, Filter.fromEntityFilter(y, fo.where)])).toBe(2);
    });
    it("test basics_2", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: { id: { gte: 2 } }
        };
        expect(await repo.count(y => [{ id: { lte: 3 } }, Filter.fromEntityFilter(y, fo.where), undefined])).toBe(2);
    });
    it("test basics_2_2", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: x => x.id.isGreaterOrEqualTo(2)
        };
        expect(await repo.count(async y => Filter.build(y, { id: { lte: 3 } }).and(await Filter.fromEntityFilter(y, fo.where)))).toBe(2);
    });
    it("test basics_2_3", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: x => x.id.isGreaterOrEqualTo(2)
        };
        expect(await repo.count(async y => Filter.build(y, { id: { lte: 3 } }).and(await Filter.fromEntityFilter(y, fo.where)))).toBe(2);
    });
    it("test basics_2_1", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: x => Promise.resolve(Filter.build(x, { id: { gte: 2 } }))
        };
        expect(await repo.count(y => [{ id: { lte: 3 } }, Filter.fromEntityFilter(y, fo.where), undefined])).toBe(2);
    });
    it("test basics_3", async () => {
        let fo: FindOptions<CategoriesForTesting> = {
            where: x => x.id.isGreaterOrEqualTo(2)
        };
        expect(await repo.count(y => [{ id: { lte: 3 } }, Filter.fromEntityFilter(y, fo.where)])).toBe(2);
    });


});



describe("custom filter", () => {
    it("test that it works", async () => {
        let c = new Remult().repo(entityForCustomFilter, new InMemoryDataProvider());
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        expect(await (c.count(entityForCustomFilter.filter({ oneAndThree: true }))))
            .toBe(2);
    });
    it("works with serialize filter", async () => {
        let z = entityForCustomFilter.oneAndThree();
        let c = new Remult().repo(entityForCustomFilter, new InMemoryDataProvider());

        let json = (await Filter.fromEntityFilter(Filter.createFilterFactories(c.metadata), entityForCustomFilter.oneAndThree())).toJson();

        expect(json).toEqual({
            $custom$oneAndThree: {}
        });
        let json3 = Filter.fromJson(c.metadata, json).toJson();
        expect(json3).toEqual(json);
    })
    it("test that it works", () =>
        testRestDb(async ({ remult }) => {
            let c = remult.repo(entityForCustomFilter);
            for (let id = 0; id < 5; id++) {
                await c.create({ id }).save();
            }
            expect(await (c.count(entityForCustomFilter.oneAndThree()))).toBe(2);
            expect((await (c.findFirst(() => [entityForCustomFilter.testNumericValue(2)]))).id).toBe(2);
            expect((await (c.findFirst(() => [entityForCustomFilter.testObjectValue({ val: 2 })]))).id).toBe(2);
        })

    );
    it("test that it works with inheritance", () =>
        testAllDataProviders(async ({ remult }) => {

            let c = remult.repo(entityForCustomFilter1);
            for (let id = 0; id < 5; id++) {
                await c.create({ id }).save();
            }
            expect(await (c.count(entityForCustomFilter1.oneAndThree()))).toBe(2);
            expect((await (c.findFirst(() => [entityForCustomFilter1.testNumericValue(2)]))).id).toBe(2);
            expect((await (c.findFirst(() => [entityForCustomFilter1.testObjectValue({ val: 2 })]))).id).toBe(2);
        })

    );
    it("test that it works with sql", async () => {
        let w = new WebSqlDataProvider("testWithFilter");

        let c = new Remult().repo(entityForCustomFilter, new SqlDatabase(w));
        await w.dropTable(c.metadata);
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        expect(await (c.count(e => SqlDatabase.customFilter(async x => x.sql = await e.id.metadata.getDbName() + ' in (' + x.addParameterAndReturnSqlToken(1) + "," + x.addParameterAndReturnSqlToken(3, c.metadata.fields.id) + ")"))))
            .toBe(2);
        expect(await (c.count(entityForCustomFilter.filter({ dbOneOrThree: true })))).toBe(2);
    });
    it("test that it works with arrayFilter", async () => {


        let c = new Remult().repo(entityForCustomFilter, new InMemoryDataProvider());
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        expect(await (c.count(e => ArrayEntityDataProvider.customFilter(x => x.id == 1 || x.id == 3))))
            .toBe(2);
        expect(await (c.count(entityForCustomFilter.filter({ dbOneOrThree: true })))).toBe(2);
    });
    it("test or and promise in translate", async () => {
        let c = new Remult().repo(entityForCustomFilter, new InMemoryDataProvider());
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        "".toString();
        expect(await (c.count({
            OR: [entityForCustomFilter.filter({ dbOneOrThree: true }), { id: 4 }]
        }))).toBe(3);
    });
    it("test sent in api", async () => {
        let ok = new Done();
        let z = new RestDataProvider("", {
            delete: undefined,
            get: async (url) => {
                ok.ok();
                expect(url).toBe('/entityForCustomFilter?__action=count&%24custom%24filter=%7B%22oneAndThree%22%3Atrue%7D');
                return { count: 0 }

            },
            post: undefined,
            put: undefined
        });
        let c = new Remult();
        c.setDataProvider(z);
        await c.repo(entityForCustomFilter).count(entityForCustomFilter.filter({ oneAndThree: true }));
        ok.test();
    });

    it("test that api reads custom correctly", async () => {
        let remult = new Remult();
        remult.setDataProvider(new InMemoryDataProvider());
        let c = remult.repo(entityForCustomFilter);
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        var api = new DataApi(c, remult);
        let t = new TestDataApiResponse();
        let d = new Done();
        t.success = data => {
            expect(data.count).toBe(2);
            d.ok();
        };
        await api.count(t, {
            get: x => {
                if (x == customUrlToken + "filter")
                    return "{\"oneAndThree\":true}";
                return undefined;
            }
        });
        d.test();
    });
    it("test that api reads custom correctly 2", async () => {
        let remult = new Remult();
        remult.setDataProvider(new InMemoryDataProvider());
        let c = remult.repo(entityForCustomFilter);
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        var api = new DataApi(c, remult);
        let t = new TestDataApiResponse();
        let d = new Done();
        t.success = data => {
            expect(data.count).toBe(2);
            d.ok();
        };
        await api.count(t, {
            get: x => {
                if (x == customUrlToken)
                    return;
                return undefined;
            }
        }, {
            "$custom$filter":
            {
                "oneAndThree": true
            }
        }
        );
        d.test();
    });
    it("test that api reads custom correctly 3", async () => {
        let remult = new Remult();
        remult.setDataProvider(new InMemoryDataProvider());
        let c = remult.repo(entityForCustomFilter);
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        var api = new DataApi(c, remult);
        let t = new TestDataApiResponse();
        let d = new Done();
        t.success = data => {
            expect(data.count).toBe(2);
            d.ok();
        };
        await api.count(t, {
            get: x => {
                if (x == customUrlToken)
                    return;
                return undefined;
            }
        }, {
            "$custom$filter":
            {
                "oneAndThree": true
            }
        }

        );
        d.test();
    });
    it("test that api reads custom correctly and translates to db", async () => {
        let remult = new Remult();
        remult.setDataProvider(new InMemoryDataProvider());
        let c = remult.repo(entityForCustomFilter);
        for (let id = 0; id < 5; id++) {
            await c.create({ id }).save();
        }
        var api = new DataApi(c, remult);
        let t = new TestDataApiResponse();
        let d = new Done();
        t.success = data => {
            expect(data.count).toBe(2);
            d.ok();
        };
        await api.count(t, {
            get: x => {
                if (x == customUrlToken + "filter")
                    return "{\"dbOneOrThree\":true}";
                return undefined;
            }
        });
        d.test();
    });

});


@Entity('entityForCustomFilter', { allowApiCrud: true })
class entityForCustomFilter extends EntityBase {
    @Field()
    id: number;
    static filter = Filter.createCustom<entityForCustomFilter, {
        oneAndThree?: boolean,
        dbOneOrThree?: boolean,
        two?: boolean
    }>(async (e, remult, c) => {
        let r: Filter[] = [];
        if (c.oneAndThree)
            r.push(Filter.build(e, { id: [1, 3] }));
        if (c.two)
            r.push(Filter.build(e, { id: 2 }));
        if (c.dbOneOrThree) {

            r.push(SqlDatabase.customFilter(async x => x.sql = await e.id.metadata.getDbName() + ' in (' + x.addParameterAndReturnSqlToken(1) + "," + x.addParameterAndReturnSqlToken(3) + ")").and(
                ArrayEntityDataProvider.customFilter(x => x.id == 1 || x.id == 3)
            ))
        }
        return r;
    });
    static oneAndThree = Filter.createCustom<entityForCustomFilter>((e) => Filter.build(e, { id: [1, 3] }));
    static testNumericValue = Filter.createCustom<entityForCustomFilter, number>((e, r, val) => Filter.build(e, { id: val }));
    static testObjectValue = Filter.createCustom<entityForCustomFilter, { val: number }>((e, r, val) => Filter.build(e, { id: val.val }));
}
@Entity('entityForCustomFilter1', { allowApiCrud: true })
class entityForCustomFilter1 extends entityForCustomFilter {

}

declare type Draft<T> = WritableDraft<T>;
declare type WritableDraft<T> = {
    -readonly [K in keyof T]: Draft<T[K]>;
};
declare type SliceCaseReducers<State> = {

    [K: string]: (state: Draft<State>) => State;
};
function x<CaseReducers extends SliceCaseReducers<{ test?: WritableDraft<entityForCustomFilter>[]; }>>(what: CaseReducers) {
}
//reproduce typescript bug with recursive types
x<{
    addComment: (state: WritableDraft<{
        test?: entityForCustomFilter[];
    }>) => {
        test: WritableDraft<entityForCustomFilter>[];
    };
}>({} as any);



@Entity('tasks')
class task extends EntityBase {
    @Field()
    title: string = '';
    @Field()
    completed: boolean = false;
}


@Entity('taskWithNull')
class taskWithNull extends EntityBase {
    @Field()
    title: string = '';
    @Field({ allowNull: true })
    completed: boolean;
}
describe("missing fields are added in array column", async () => {
    it("not allow null", async () => {
        let db = new InMemoryDataProvider();
        db.rows['tasks'] = [{
            title: 't1'
        },
        {
            title: 't2',
            completed: true
        },
        {
            title: 't3'
        }]
        let r = new Remult();

        r.setDataProvider(db);
        let rep = r.repo(task);
        expect((await rep.find({ orderBy: task => [task.completed, task.title] })).map(x => x.title)).toEqual(["t1", "t3", "t2"]);
        expect(await rep.count({ completed: false })).toBe(2);
        let t = (await rep.findFirst(() => [{ title: 't1' }]));
        expect(t.completed).toBe(false);
        t.completed = undefined;
        await t.save();
        expect(t.completed).toBe(false);
        t.completed = null;
        await t.save();
        expect(t.completed).toBe(false);
        t = rep.create({ title: '4' });
        await t.save();
        expect(t.completed).toBe(false);

    });
    it("allow  null", async () => {
        let db = new InMemoryDataProvider();
        db.rows['taskWithNull'] = [{
            title: 't1'
        },
        {
            title: 't2',
            completed: true
        },
        {
            title: 't3'
        }]
        let r = new Remult();

        r.setDataProvider(db);
        let rep = r.repo(taskWithNull);
        expect((await rep.find({ orderBy: task => [task.completed, task.title] })).map(x => x.title)).toEqual(["t1", "t3", "t2"]);
        expect(await rep.count({ completed: false })).toBe(0);
        let t = (await rep.findFirst(() => [{ title: 't1' }]));
        expect(t.completed).toBe(undefined);
        t.completed = undefined;
        await t.save();
        expect(t.completed).toBe(undefined);
        t.completed = null;
        await t.save();
        expect(t.completed).toBe(null);
        t = rep.create({ title: '4' });
        await t.save();
        expect(t.completed).toBe(undefined);

    });
});


