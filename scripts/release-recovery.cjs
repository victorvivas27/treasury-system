const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const releaseBranch = 'release-please--branches--main';

async function waitForMergedValidation({ github, context, sha, sleep = pause, attempts = 180, info = () => {} }) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('An immutable release commit is required');
  const repository = `${context.repo.owner}/${context.repo.repo}`;
  const prs = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
    ...context.repo, commit_sha: sha, per_page: 100,
  });
  const pr = prs.find(item => item.merged_at && item.merge_commit_sha === sha &&
    item.base.ref === 'main' && item.head.repo?.full_name === repository);
  if (!pr) return { tag: '', sha };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await github.rest.actions.listWorkflowRuns({
      ...context.repo, workflow_id: '00-pr-validation.yml',
      head_sha: pr.head.sha, event: 'pull_request', per_page: 100,
    });
    const run = data.workflow_runs.filter(item => item.head_sha === pr.head.sha &&
      item.head_branch === pr.head.ref && item.head_repository?.full_name === repository &&
      item.path?.split('@')[0] === '.github/workflows/00-pr-validation.yml')
      .sort((a, b) => b.id - a.id)[0];
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`PR #${pr.number} validation ${run.conclusion}; publication blocked`);
      const { data: current } = await github.rest.pulls.get({ ...context.repo, pull_number: pr.number });
      if (!current.merged || current.merge_commit_sha !== sha || current.head.sha !== pr.head.sha ||
          current.base.ref !== 'main' || current.head.repo?.full_name !== repository) {
        throw new Error('The merged PR changed while waiting for validation');
      }
      if (pr.head.ref !== releaseBranch) return { tag: '', sha };
      const { data: manifest } = await github.rest.repos.getContent({
        ...context.repo, path: '.release-please-manifest.json', ref: sha,
      });
      if (Array.isArray(manifest) || manifest.encoding !== 'base64') throw new Error('Invalid release manifest');
      const version = JSON.parse(Buffer.from(manifest.content, 'base64').toString('utf8'))['.'];
      if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Invalid stable release version');
      return { tag: `v${version}`, sha };
    }
    info(`PR #${pr.number}: waiting for validation (${attempt + 1}/${attempts})`);
    if (attempt + 1 < attempts) await sleep(10_000);
  }
  throw new Error(`PR #${pr.number} validation is absent or pending; publication blocked`);
}

async function reconcileRelease({ github, context, sha, expectedTag, released, tag, outcomes }) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('An immutable release commit is required');
  if (expectedTag && released && tag && tag !== expectedTag) throw new Error('Release Please returned an unexpected tag');
  if (released && !expectedTag && !tag) throw new Error('Release Please did not identify the published tag');
  const selected = expectedTag || (released ? tag : '');
  if (selected) {
    if (!/^v\d+\.\d+\.\d+$/.test(selected)) throw new Error('Invalid release tag');
    const { data: release } = await github.rest.repos.getReleaseByTag({ ...context.repo, tag: selected });
    const { data: commit } = await github.rest.repos.getCommit({ ...context.repo, ref: `refs/tags/${selected}` });
    if (release.tag_name !== selected || release.draft || release.prerelease || !release.published_at || commit.sha !== sha) {
      throw new Error('Published release does not match the selected commit');
    }
    return { releases_created: 'true', tag_name: selected };
  }
  if (!outcomes.includes('success')) throw new Error('Release Please failed after three bounded attempts');
  return { releases_created: 'false', tag_name: '' };
}

module.exports = { waitForMergedValidation, reconcileRelease };
