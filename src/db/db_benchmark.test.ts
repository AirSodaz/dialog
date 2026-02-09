// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import Dexie, { type Table } from 'dexie';
import { describe, it, expect } from 'vitest';

/**
 * Benchmark test for measuring performance of metadata fetching vs full content fetching.
 * Uses a modified schema (number for boolean) to bypass fake-indexeddb limitations.
 */

// Define Benchmark DB
interface BenchDocument {
    id: string;
    title: string;
    content: any;
    updatedAt: number;
    isFavorite: number; // 0 or 1
    isDeleted: number; // 0 or 1
    deletedAt?: number;
}

class BenchDB extends Dexie {
    documents!: Table<BenchDocument>;

    constructor() {
        super('BenchDB');
        this.version(1).stores({
            // Includes updated indices covering all metadata
            documents: 'id, updatedAt, isFavorite, isDeleted, [isDeleted+updatedAt], [isDeleted+updatedAt+title+id+isFavorite]'
        });
    }
}

describe('getAllDocuments Performance Benchmark', () => {
    const db = new BenchDB();
    const TOTAL_DOCS = 500;

    // Setup data
    it('populates database with heavy documents', async () => {
        // Create docs with ~5KB content each
        const heavyContent = {
            type: 'doc',
            content: Array(50).fill({
                type: 'paragraph',
                content: [{ type: 'text', text: 'Lorem ipsum dolor sit amet '.repeat(10) }]
            })
        };

        const docs: BenchDocument[] = [];
        for (let i = 0; i < TOTAL_DOCS; i++) {
            docs.push({
                id: crypto.randomUUID(),
                title: `Document ${i}`,
                content: heavyContent,
                updatedAt: i, // Use i for easy sorting check
                isFavorite: i % 2 === 0 ? 1 : 0, // Mixed favorites
                isDeleted: 0,
            });
        }

        await db.documents.bulkPut(docs);
    }, 20000);

    it('measures getAllDocuments (OLD way - full content)', async () => {
        const start = performance.now();

        const results = await db.documents
            .where('[isDeleted+updatedAt]')
            .between([0, -Infinity], [0, Infinity])
            .reverse()
            .toArray();

        const end = performance.now();
        console.log(`[Benchmark] Old Method (Full Content): ${(end - start).toFixed(2)}ms`);

        expect(results.length).toBe(TOTAL_DOCS);
        // Verify content is present
        expect(results[0].content).toBeDefined();
    }, 20000);

    it('measures getAllDocuments (NEW way - keys only)', async () => {
        const start = performance.now();

        // Use explicit bounds
        const results = await db.documents
            .where('[isDeleted+updatedAt+title+id+isFavorite]')
            .between(
                [0, -Infinity, "", "", 0],
                [0, Infinity, "\uffff", "\uffff", 1]
            )
            .reverse()
            .keys();

        const mapped = results.map(k => {
            const key = k as any[]; // [isDeleted, updatedAt, title, id, isFavorite]
            return {
                isDeleted: key[0],
                updatedAt: key[1],
                title: key[2],
                id: key[3],
                isFavorite: key[4],
                // content is undefined
            };
        });

        const end = performance.now();
        console.log(`[Benchmark] New Method (Metadata Only): ${(end - start).toFixed(2)}ms`);
        console.log(`[Benchmark] Note: In fake-indexeddb (in-memory), fetching keys might be slower than fetching objects due to overhead. Real performance gain is from Disk I/O reduction.`);

        expect(mapped.length).toBe(TOTAL_DOCS);
        // Verify we got the data we need
        expect(mapped[0].id).toBeDefined();
        expect(mapped[0].title).toBeDefined();
        expect(mapped[0].updatedAt).toBeDefined();
        expect(mapped[0].isFavorite).toBeDefined();
        // Check sorting (reverse updatedAt)
        expect(mapped[0].updatedAt).toBeGreaterThan(mapped[1].updatedAt);
        // Check mixed favorites
        const favs = mapped.filter(d => d.isFavorite === 1);
        expect(favs.length).toBeGreaterThan(0);
    }, 20000);
});
