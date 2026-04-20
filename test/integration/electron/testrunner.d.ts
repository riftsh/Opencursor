import { MochaOptions } from 'mocha';

export function configure(opts: MochaOptions): void;

export function run(testsRoot: string[], clb: (error: Error | undefined, failures: number | undefined) => void): void;
