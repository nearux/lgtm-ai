import { Milestone } from 'lucide-react';
import { LabelChip } from '@/shared/components';
import type {
  IssueAssignee,
  IssueLabel,
  IssueMilestone,
} from '@lgtmai/backend/types';

interface Props {
  assignees: IssueAssignee[];
  labels: IssueLabel[];
  milestone: IssueMilestone | null;
}

export const IssueSidebar = ({ assignees, labels, milestone }: Props) => {
  return (
    <aside className="space-y-6">
      <Section title="Assignees">
        {assignees.length === 0 ? (
          <EmptyText>No one assigned</EmptyText>
        ) : (
          <ul className="space-y-2">
            {assignees.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <span className="font-medium">{a.login}</span>
                {a.name && a.name !== a.login && (
                  <span className="text-gray-500">{a.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Labels">
        {labels.length === 0 ? (
          <EmptyText>None yet</EmptyText>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <LabelChip key={label.id} name={label.name} color={label.color} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Milestone">
        {milestone ? (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Milestone className="h-4 w-4 text-gray-500" />
            <span>{milestone.title}</span>
          </div>
        ) : (
          <EmptyText>No milestone</EmptyText>
        )}
      </Section>
    </aside>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = ({ title, children }: SectionProps) => (
  <div>
    <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
      {title}
    </h3>
    {children}
  </div>
);

const EmptyText = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-400">{children}</p>
);
