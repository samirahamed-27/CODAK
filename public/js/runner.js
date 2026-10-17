/**
 * Safe Code Runner Module (Web Worker + Blob Sandbox)
 * Mirai-Game / CODAK Platform
 * 
 * Runs user code inside an isolated Web Worker instantiated from a Blob URL.
 * Never executes eval() or Function() on the main browser thread.
 * Enforces a strict 2-second timeout to kill infinite loops.
 */

(function () {
  'use strict';

  // Deep equality helper for comparing outputs against expected results
  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
      return true;
    }
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  // Worker code string converted into Blob URL at execution time
  const WORKER_SCRIPT = `
self.onmessage = function (e) {
  var data = e.data;
  var code = data.code;
  var functionName = data.functionName;
  var tests = data.tests || [];

  try {
    // Compile user script inside worker global scope
    var executeFn = new Function(
      code + "\\n" +
      "return (typeof " + functionName + " !== 'undefined' ? " + functionName + " : null);"
    );

    var targetFn = executeFn();

    if (typeof targetFn !== 'function') {
      self.postMessage({
        passed: false,
        results: [],
        error: "Function '" + functionName + "' is not defined or is not a callable function."
      });
      return;
    }

    var results = [];
    var allPassed = true;

    for (var i = 0; i < tests.length; i++) {
      var testCase = tests[i];
      var args;
      try {
        args = JSON.parse(JSON.stringify(testCase.input));
      } catch (cloneErr) {
        args = Array.isArray(testCase.input) ? testCase.input.slice() : [testCase.input];
      }

      var got;
      try {
        got = targetFn.apply(null, args);
      } catch (runErr) {
        self.postMessage({
          passed: false,
          results: results,
          error: "Runtime error on test " + (i + 1) + ": " + (runErr && runErr.message ? runErr.message : String(runErr))
        });
        return;
      }

      var isPass = deepEqual(got, testCase.expected);
      if (!isPass) {
        allPassed = false;
      }

      results.push({
        pass: isPass,
        expected: testCase.expected,
        got: got
      });
    }

    self.postMessage({
      passed: allPassed,
      results: results,
      error: null
    });

  } catch (parseErr) {
    self.postMessage({
      passed: false,
      results: [],
      error: "Syntax / execution error: " + (parseErr && parseErr.message ? parseErr.message : String(parseErr))
    });
  }
};

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
    return true;
  }
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  var keysA = Object.keys(a);
  var keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (var i = 0; i < keysA.length; i++) {
    var key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
`;

  /**
   * runCode(userCode, challenge)
   * Executes user code against challenge test suites inside a sandboxed Web Worker.
   *
   * @param {string} userCode The raw JavaScript text typed by user
   * @param {Object} challenge The challenge object with functionName and tests array
   * @returns {Promise<{ passed: boolean, results: Array<{pass: boolean, expected: any, got: any}>, error: string|null }>}
   */
  function runCode(userCode, challenge) {
    return new Promise(function (resolve) {
      if (!challenge || !challenge.functionName) {
        resolve({
          passed: false,
          results: [],
          error: 'Invalid challenge specification.'
        });
        return;
      }

      // Check for Web Worker and Blob support in environment
      if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
        resolve({
          passed: false,
          results: [],
          error: 'Web Workers are not supported in this runtime environment.'
        });
        return;
      }

      var blob;
      var workerUrl;
      var worker;
      var timeoutTimer = null;
      var isResolved = false;

      function cleanUp() {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (worker) {
          try {
            worker.terminate();
          } catch (_) {}
          worker = null;
        }
        if (workerUrl) {
          try {
            URL.revokeObjectURL(workerUrl);
          } catch (_) {}
          workerUrl = null;
        }
      }

      function finish(result) {
        if (!isResolved) {
          isResolved = true;
          cleanUp();
          resolve(result);
        }
      }

      try {
        blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
        workerUrl = URL.createObjectURL(blob);
        worker = new Worker(workerUrl);

        // 2-Second execution timeout to terminate infinite loops
        timeoutTimer = setTimeout(function () {
          finish({
            passed: false,
            results: [],
            error: 'TIMEOUT: possible infinite loop (execution exceeded 2s).'
          });
        }, 2000);

        worker.onmessage = function (event) {
          var data = event.data || {};
          finish({
            passed: !!data.passed,
            results: data.results || [],
            error: data.error || null
          });
        };

        worker.onerror = function (event) {
          finish({
            passed: false,
            results: [],
            error: 'Worker Error: ' + (event && event.message ? event.message : 'Execution halted.')
          });
        };

        // Post challenge payload to worker
        worker.postMessage({
          code: userCode || '',
          functionName: challenge.functionName,
          tests: challenge.tests || []
        });

      } catch (err) {
        finish({
          passed: false,
          results: [],
          error: 'Failed to initialize safe runner: ' + (err && err.message ? err.message : String(err))
        });
      }
    });
  }

  // Export globally
  window.runCode = runCode;
  window.deepEqual = deepEqual;
  window.CodeRunner = {
    runCode: runCode,
    deepEqual: deepEqual
  };
})();
