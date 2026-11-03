"""Build the browser copy from reviewed edits to the canonical original drafts."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
bank = json.loads((root / 'data/original-bank.json').read_text())
assert len(bank) == 40 and len({q['id'] for q in bank}) == 40
for q in bank:
    assert q['source'] == 'original' and q['reviewStatus'] == 'unreviewed'
    assert len(q['options']) == len(q['optionExplanations']) == 4
    assert 0 <= q['answer'] < 4
(root / 'data/original-bank.js').write_text('// AI original practice drafts. Not official examination questions.\nconst originalBank = ' + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n')
