import { ContainerModule } from 'inversify';
import { ProjectRepository } from './project.repository.js';
import { ChatSessionRepository } from './chat-session.repository.js';
import { ProjectsService } from './projects.service.js';
import { PRListService } from './pr-list.service.js';
import { PRDetailService } from './pr-detail.service.js';
import { CheckoutService } from './checkout-pr-branch.service.js';
import { ChatSessionsService } from './chat-sessions.service.js';
import { GitService } from './git.service.js';
import { ProjectsController } from './projects.controller.js';

export const projectsModule = new ContainerModule((options) => {
  options.bind(ProjectRepository).toSelf();
  options.bind(ChatSessionRepository).toSelf();
  options.bind(ProjectsService).toSelf();
  options.bind(PRListService).toSelf();
  options.bind(PRDetailService).toSelf();
  options.bind(CheckoutService).toSelf();
  options.bind(ChatSessionsService).toSelf();
  options.bind(GitService).toSelf();
  options.bind(ProjectsController).toSelf();
});
