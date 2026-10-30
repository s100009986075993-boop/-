"""Publish only static website files to gh-pages using the current Git checkout.

Requires an existing source commit and Git push access. Does not enable GitHub
Pages settings, change repository visibility, or force-push existing history.
"""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]


def git(*args, env=None):
    return subprocess.check_output(['git', '-C', str(root), *args], env=env).decode().strip()


source = git('rev-parse', '--verify', 'HEAD^{commit}')
expected = ['index.html', 'style.css', '.nojekyll']
expected += [p.name for p in sorted(root.glob('*.js'))]
expected += ['data', 'assets']
for entry in expected:
    if not (root / entry).exists():
        raise SystemExit('Missing publication entry: ' + entry)

# A temporary index keeps the developer's staging area unchanged. Build a commit
# whose parent is the remote publication tip, so all pushes are fast-forward.
remote = git('ls-remote', 'origin', 'refs/heads/gh-pages')
parent = remote.split()[0] if remote else None
if parent:
    git('fetch', '--no-tags', 'origin', 'refs/heads/gh-pages')
with tempfile.TemporaryDirectory(prefix='architect-pages-') as directory:
    env = os.environ.copy()
    env['GIT_INDEX_FILE'] = str(Path(directory) / 'index')
    git('read-tree', '--empty', env=env)
    git('add', '--', *expected, env=env)
    tree = git('write-tree', env=env)
    if parent and tree == git('rev-parse', parent + '^{tree}'):
        print('Publication already matches source ' + source)
    else:
        args = ['commit-tree', tree]
        if parent:
            args += ['-p', parent]
        args += ['-m', 'Publish architect study website from ' + source]
        commit = git(*args, env=env)
        git('push', 'origin', commit + ':refs/heads/gh-pages')
        print('Published static files to gh-pages: ' + commit)
