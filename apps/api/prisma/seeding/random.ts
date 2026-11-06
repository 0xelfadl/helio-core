export type Rng = () => number; 
// create random number gnerator we use Mulberry32
export function createRng(seed: number): Rng {
   let state = seed >>> 0;
   return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}
// weigth pick
export function weightedPick<T>(rng:Rng ,options: ReadonlyArray<readonly [T, number]>,): T {
    const total = options.reduce((sum , [, weigth]) => sum + weigth, 0);
    let roll = rng() * total;
    for(const [value, weigth] of options) {
        roll -= weigth;
        if (roll < 0) return value;
    }
    return options[options.length - 1]![0];
}
// skwed index
export function skewedIndex(rng: Rng, n: number): number {
    return Math.floor(rng() ** 2 * n);
}