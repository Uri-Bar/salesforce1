define(["require", "exports"], function (require, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @description Executes a function and captures the duration it took to execute.
     * @param func The function to benchmark
     * @returns a BenchmarkResult with the duration in ms the function took to run and the result of the function if any
     */
    function benchmark(func) {
        var startTime = new Date().getTime();
        var result = func();
        var endTime = new Date().getTime();
        return {
            duration: endTime - startTime,
            returnValue: result,
        };
    }
    exports.benchmark = benchmark;
});
