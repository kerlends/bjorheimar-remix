/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />

type Awaited<P> = P extends Promise<infer T> ? T : unknown;

type AwaitedReturnType<F extends (...args: any[]) => any> = Awaited<
	ReturnType<F>
>;
