import { useEffect, useState } from 'react';
import { runValidationTests, TestResult } from '../lib/validation.test';
import { CheckCircle, XCircle, Beaker } from 'lucide-react';

export default function TestResults() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    async function runTests() {
      const testResults = await runValidationTests();
      setResults(testResults);
      setIsRunning(false);
    }
    runTests();
  }, []);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total && total > 0;

  if (isRunning) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <Beaker className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="text-gray-300">Running validation tests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Beaker className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Validation Test Suite</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          allPassed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {allPassed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {passed}/{total} passed
        </div>
      </div>

      {/* Results */}
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {results.map((result, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
              result.passed ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'
            }`}
          >
            {result.passed ? (
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <p className="text-gray-200 font-medium">{result.name}</p>
              <p className={`text-xs mt-0.5 ${result.passed ? 'text-green-400/70' : 'text-red-400/70'}`}>
                {result.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
