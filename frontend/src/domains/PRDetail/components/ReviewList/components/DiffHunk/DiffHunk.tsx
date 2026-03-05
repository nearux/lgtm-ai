import { Diff, Hunk, parseDiff } from 'react-diff-view';
import 'react-diff-view/style/index.css';

interface Props {
  diffHunk: string;
  filePath: string;
}

export const DiffHunk = ({ diffHunk, filePath }: Props) => {
  const fakeDiff = `diff --git a/${filePath} b/${filePath}\n--- a/${filePath}\n+++ b/${filePath}\n${diffHunk}`;

  let files;
  try {
    files = parseDiff(fakeDiff);
  } catch {
    return (
      <pre className="overflow-x-auto bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
        {diffHunk}
      </pre>
    );
  }

  if (!files.length || !files[0].hunks.length) {
    return (
      <pre className="overflow-x-auto bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
        {diffHunk}
      </pre>
    );
  }

  const { type, hunks } = files[0];

  return (
    <div className="overflow-x-auto text-xs">
      <Diff viewType="unified" diffType={type} hunks={hunks}>
        {(hunks) =>
          hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)
        }
      </Diff>
    </div>
  );
};
