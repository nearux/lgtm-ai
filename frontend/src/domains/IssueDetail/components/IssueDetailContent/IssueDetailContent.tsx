import { useSuspenseQueries } from '@tanstack/react-query';
import {
  getIssueDetailQueryOptions,
  getProjectDetailQueryOptions,
} from '@/queries';
import { linkifyGitHubReferences, parseGitHubUrl } from '@/shared/utils';
import { IssueHeader } from '../IssueHeader/IssueHeader';
import { IssueSidebar } from '../IssueSidebar/IssueSidebar';
import { IssueDescription } from '../IssueDescription/IssueDescription';
import { IssueComments } from '../IssueComments/IssueComments';

interface Props {
  projectId: string;
  issueNumber: string;
  origin?: string;
}

export const IssueDetailContent = ({
  projectId,
  issueNumber,
  origin,
}: Props) => {
  const [{ data: project }, { data: issue }] = useSuspenseQueries({
    queries: [
      getProjectDetailQueryOptions(projectId),
      getIssueDetailQueryOptions(projectId, Number(issueNumber), origin),
    ],
  });

  const remote = project.gitInfo.remotes.find(
    (r) => r.name === (origin ?? 'origin')
  );
  const githubBaseUrl = parseGitHubUrl(
    remote?.url ?? project.gitInfo.remoteUrl
  );
  const linkedBody = linkifyGitHubReferences(issue.body ?? '', githubBaseUrl);

  return (
    <>
      <IssueHeader issue={issue} />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_240px]">
        <div>
          <IssueDescription body={linkedBody} />
          <IssueComments
            comments={issue.comments}
            githubBaseUrl={githubBaseUrl}
          />
        </div>
        <IssueSidebar
          assignees={issue.assignees}
          labels={issue.labels}
          milestone={issue.milestone}
        />
      </div>
    </>
  );
};
