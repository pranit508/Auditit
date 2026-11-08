#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python -m compileall -q server.py routes utils
python -m unittest discover -s tests -p 'test_*.py'
node --experimental-default-type=module tests/buyer-details.test.mjs
node --experimental-default-type=module tests/upload-screen.test.mjs
node --experimental-default-type=module tests/document-validation.test.mjs
node --experimental-default-type=module tests/invoice-rendering.test.mjs
node --experimental-default-type=module tests/tax-input-ui.test.mjs
