import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs } from '@/shared/components';

export type ProjectViewKind = 'prs' | 'issues';

interface Props {
  projectId: string;
  value: ProjectViewKind;
}

const options: { value: ProjectViewKind; label: string }[] = [
  { value: 'issues', label: 'Issues' },
  { value: 'prs', label: 'Pull Requests' },
];

export const ProjectKindTabs = ({ projectId, value }: Props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleChange = (kind: ProjectViewKind) => {
    const origin = searchParams.get('origin');
    const query = origin ? `?origin=${encodeURIComponent(origin)}` : '';
    navigate(`/projects/${projectId}/${kind}${query}`);
  };

  return <Tabs options={options} value={value} onChange={handleChange} />;
};
