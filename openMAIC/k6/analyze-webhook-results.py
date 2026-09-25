#!/usr/bin/env python3

"""
Webhook Load Test Results Analyzer

Parses k6 CSV output from webhook load tests and generates a comprehensive
analysis including latency percentiles, error rates, and performance summaries.

Usage:
    python3 analyze-webhook-results.py webhook-results-baseline.csv
    python3 analyze-webhook-results.py webhook-results-*.csv

Output:
    - Console summary with key metrics
    - JSON report (if requested)
    - Pass/fail comparison against thresholds

Author: DailyAgile Platform
Last Updated: 2026-08-23
"""

import sys
import csv
import json
from pathlib import Path
from collections import defaultdict
from statistics import mean, median, stdev
from datetime import datetime

class WebhookResultsAnalyzer:
    """Analyzes k6 webhook load test CSV results"""

    # Performance thresholds by scenario
    THRESHOLDS = {
        'baseline': {
            'p50_latency_ms': 200,
            'p95_latency_ms': 500,
            'p99_latency_ms': 800,
            'error_rate_pct': 0.1,
            'success_rate_pct': 99.9,
        },
        'spike': {
            'p95_latency_ms': 2000,
            'p99_latency_ms': 5000,
            'error_rate_pct': 5.0,
            'success_rate_pct': 95.0,
        },
        'sustained': {
            'p50_latency_ms': 200,
            'p95_latency_ms': 500,
            'p99_latency_ms': 1000,
            'error_rate_pct': 1.0,
            'success_rate_pct': 99.0,
        },
    }

    def __init__(self, csv_file):
        self.csv_file = Path(csv_file)
        self.data = defaultdict(list)
        self.metrics = {}
        self.scenario = self._detect_scenario()

    def _detect_scenario(self):
        """Detect scenario from filename"""
        filename = self.csv_file.name.lower()
        for scenario in self.THRESHOLDS.keys():
            if scenario in filename:
                return scenario
        return 'baseline'  # Default

    def load_csv(self):
        """Load CSV file and parse metrics"""
        if not self.csv_file.exists():
            print(f"Error: File not found: {self.csv_file}")
            return False

        try:
            with open(self.csv_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    metric_name = row.get('metric_name', '')
                    value = row.get('value', '')

                    if not metric_name or not value:
                        continue

                    try:
                        # Parse value (might be numeric or float)
                        numeric_value = float(value) if '.' in value else int(value)
                        self.data[metric_name].append(numeric_value)
                    except ValueError:
                        pass

            return True
        except Exception as e:
            print(f"Error reading CSV: {e}")
            return False

    def calculate_percentiles(self, values):
        """Calculate percentiles for a list of values"""
        if not values:
            return {}

        sorted_vals = sorted(values)
        n = len(sorted_vals)

        return {
            'min': sorted_vals[0],
            'p50': sorted_vals[int(n * 0.50)],
            'p90': sorted_vals[int(n * 0.90)] if n > 1 else sorted_vals[0],
            'p95': sorted_vals[int(n * 0.95)] if n > 1 else sorted_vals[0],
            'p99': sorted_vals[int(n * 0.99)] if n > 1 else sorted_vals[0],
            'max': sorted_vals[-1],
            'avg': mean(sorted_vals),
            'median': median(sorted_vals),
            'stdev': stdev(sorted_vals) if len(sorted_vals) > 1 else 0,
            'count': n,
        }

    def analyze(self):
        """Run complete analysis"""
        if not self.load_csv():
            return False

        # Extract webhook-specific metrics
        webhook_latency = self.data.get('webhook_latency', [])
        webhook_success = len(self.data.get('webhook_success', []))
        webhook_errors = len(self.data.get('webhook_errors', []))
        http_failed = self.data.get('http_req_failed', [])
        idempotency_hits = len(self.data.get('idempotency_hits', []))
        rate_limit_hits = len(self.data.get('rate_limit_hits', []))
        validation_errors = len(self.data.get('validation_errors', []))

        # Calculate metrics
        total_requests = webhook_success + webhook_errors
        success_rate = (webhook_success / total_requests * 100) if total_requests > 0 else 0
        error_rate = (webhook_errors / total_requests * 100) if total_requests > 0 else 0

        # Store metrics
        self.metrics = {
            'scenario': self.scenario,
            'file': str(self.csv_file),
            'timestamp': datetime.now().isoformat(),
            'total_requests': total_requests,
            'success_count': webhook_success,
            'error_count': webhook_errors,
            'success_rate_pct': success_rate,
            'error_rate_pct': error_rate,
            'idempotency_hits': idempotency_hits,
            'rate_limit_hits': rate_limit_hits,
            'validation_errors': validation_errors,
            'latency': self.calculate_percentiles(webhook_latency),
            'thresholds': self.THRESHOLDS.get(self.scenario, {}),
        }

        return True

    def check_thresholds(self):
        """Check if results meet performance thresholds"""
        if not self.metrics:
            return []

        failures = []
        thresholds = self.metrics['thresholds']
        latency = self.metrics['latency']

        # Check latency thresholds
        for metric, threshold in thresholds.items():
            if 'latency' in metric:
                percentile = metric.replace('_latency_ms', '').replace('p', 'p')
                actual = latency.get(percentile.lower())

                if actual and actual > threshold:
                    failures.append({
                        'metric': metric,
                        'expected': threshold,
                        'actual': actual,
                        'status': 'FAIL',
                    })
            elif 'error_rate' in metric:
                if self.metrics['error_rate_pct'] > threshold:
                    failures.append({
                        'metric': metric,
                        'expected': threshold,
                        'actual': self.metrics['error_rate_pct'],
                        'status': 'FAIL',
                    })
            elif 'success_rate' in metric:
                if self.metrics['success_rate_pct'] < threshold:
                    failures.append({
                        'metric': metric,
                        'expected': threshold,
                        'actual': self.metrics['success_rate_pct'],
                        'status': 'FAIL',
                    })

        return failures

    def print_summary(self):
        """Print analysis summary to console"""
        if not self.metrics:
            print("No metrics to analyze")
            return

        print("\n" + "="*70)
        print(f"Webhook Load Test Results — {self.scenario.upper()}")
        print("="*70 + "\n")

        # Basic counts
        print("REQUEST SUMMARY:")
        print(f"  Total Requests:     {self.metrics['total_requests']}")
        print(f"  Successful:         {self.metrics['success_count']} ({self.metrics['success_rate_pct']:.2f}%)")
        print(f"  Failed:             {self.metrics['error_count']} ({self.metrics['error_rate_pct']:.2f}%)")
        print()

        # Latency metrics
        print("LATENCY METRICS (milliseconds):")
        latency = self.metrics['latency']
        print(f"  Min:                {latency['min']:.2f} ms")
        print(f"  P50 (Median):       {latency['p50']:.2f} ms")
        print(f"  P90:                {latency['p90']:.2f} ms")
        print(f"  P95:                {latency['p95']:.2f} ms")
        print(f"  P99:                {latency['p99']:.2f} ms")
        print(f"  Max:                {latency['max']:.2f} ms")
        print(f"  Mean:               {latency['avg']:.2f} ms")
        print(f"  Std Dev:            {latency['stdev']:.2f} ms")
        print()

        # Special events
        if self.metrics['idempotency_hits'] > 0:
            print("REPLAY PROTECTION:")
            print(f"  Idempotency Hits:   {self.metrics['idempotency_hits']} (replays detected)")
            print()

        if self.metrics['rate_limit_hits'] > 0:
            print("RATE LIMITING:")
            print(f"  Rate Limit Hits:    {self.metrics['rate_limit_hits']} (429 responses)")
            print()

        if self.metrics['validation_errors'] > 0:
            print("VALIDATION:")
            print(f"  Validation Errors:  {self.metrics['validation_errors']} (400 responses)")
            print()

        # Threshold check
        failures = self.check_thresholds()
        print("THRESHOLD CHECK:")
        if not failures:
            print("  ✓ All thresholds passed")
        else:
            print(f"  ✗ {len(failures)} threshold(s) exceeded:")
            for failure in failures:
                print(f"    - {failure['metric']}: {failure['actual']:.2f} (max: {failure['expected']})")
        print()

        # Recommendations
        print("RECOMMENDATIONS:")
        if self.metrics['error_rate_pct'] > 0:
            print(f"  ⚠  High error rate ({self.metrics['error_rate_pct']:.2f}%)")
            print("     → Check webhook endpoint logs")
            print("     → Verify Stripe signature validation")

        if latency['p99'] > 1000:
            print(f"  ⚠  High P99 latency ({latency['p99']:.0f}ms)")
            print("     → Check database query performance")
            print("     → Monitor application memory usage")

        if self.metrics['success_rate_pct'] < 99:
            print(f"  ⚠  Success rate below 99% ({self.metrics['success_rate_pct']:.2f}%)")
            print("     → Investigate error logs")
            print("     → Check for infrastructure issues")

        if self.metrics['validation_errors'] > 0:
            print(f"  ℹ  {self.metrics['validation_errors']} validation errors")
            print("     → Check webhook payload format")
            print("     → Verify metadata fields (course_id, email, product_type)")

        print()

    def export_json(self, output_file=None):
        """Export results as JSON"""
        if not self.metrics:
            return False

        if output_file is None:
            output_file = self.csv_file.with_suffix('.json')

        try:
            with open(output_file, 'w') as f:
                json.dump(self.metrics, f, indent=2)
            print(f"Results exported to: {output_file}")
            return True
        except Exception as e:
            print(f"Error exporting JSON: {e}")
            return False


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python3 analyze-webhook-results.py <csv_file> [csv_file2] ...")
        print("\nExample:")
        print("  python3 analyze-webhook-results.py webhook-results-baseline.csv")
        print("  python3 analyze-webhook-results.py webhook-results-*.csv")
        sys.exit(1)

    # Analyze all provided files
    csv_files = sys.argv[1:]
    all_passed = True

    for csv_file in csv_files:
        analyzer = WebhookResultsAnalyzer(csv_file)

        if analyzer.analyze():
            analyzer.print_summary()

            # Check thresholds
            failures = analyzer.check_thresholds()
            if failures:
                all_passed = False
        else:
            print(f"Failed to analyze: {csv_file}")
            all_passed = False

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    main()
