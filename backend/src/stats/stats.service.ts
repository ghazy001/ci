import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats() {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({
      where: { isActive: true },
    });
    const inactiveUsers = await this.prisma.user.count({
      where: { isActive: false },
    });
    const admins = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });
    const testers = await this.prisma.user.count({
      where: { role: Role.TESTER },
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      admins,
      testers,
    };
  }
  async getTesterStats(userId: string) {
    const projectMemberships = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });

    const projectIds = projectMemberships.map(
      (membership) => membership.projectId,
    );

    const assignedWorkItems = await this.prisma.workItem.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: {
        id: true,
      },
    });

    const workItemIds = assignedWorkItems.map((item) => item.id);

    const [
      totalProjects,
      totalWorkItems,
      readyWorkItems,
      analyzedWorkItems,
      failedWorkItems,
      totalTestCases,
      approvedTestCases,
      pendingTestCases,
      totalAutomationScripts,
      approvedAutomationScripts,
      totalExecutions,
      passedExecutions,
      failedExecutions,
      scheduledRuns,
    ] = await Promise.all([
      this.prisma.project.count({
        where: {
          members: {
            some: { userId },
          },
        },
      }),

      this.prisma.workItem.count({
        where: {
          projectId: { in: projectIds },
        },
      }),

      this.prisma.workItem.count({
        where: {
          projectId: { in: projectIds },
          status: 'READY_FOR_AI',
        },
      }),

      this.prisma.workItem.count({
        where: {
          projectId: { in: projectIds },
          status: 'ANALYZED',
        },
      }),

      this.prisma.workItem.count({
        where: {
          projectId: { in: projectIds },
          status: 'FAILED',
        },
      }),

      this.prisma.testCase.count({
        where: {
          workItemId: { in: workItemIds },
        },
      }),

      this.prisma.testCase.count({
        where: {
          workItemId: { in: workItemIds },
          status: 'APPROVED',
        },
      }),

      this.prisma.testCase.count({
        where: {
          workItemId: { in: workItemIds },
          status: {
            in: ['GENERATED', 'EDITED'],
          },
        },
      }),

      this.prisma.automationScript.count({
        where: {
          workItemId: { in: workItemIds },
          status: {
            not: 'REMOVED',
          },
        },
      }),

      this.prisma.automationScript.count({
        where: {
          workItemId: { in: workItemIds },
          status: 'APPROVED',
        },
      }),

      this.prisma.automationScriptExecution.count({
        where: {
          workItemId: { in: workItemIds },
        },
      }),

      this.prisma.automationScriptExecution.count({
        where: {
          workItemId: { in: workItemIds },
          status: 'PASSED',
        },
      }),

      this.prisma.automationScriptExecution.count({
        where: {
          workItemId: { in: workItemIds },
          status: {
            in: ['FAILED', 'TIMED_OUT'],
          },
        },
      }),

      this.prisma.scheduledTestRun.count({
        where: {
          projectId: { in: projectIds },
          status: 'ACTIVE',
        },
      }),
    ]);

    const recentProjects = await this.prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
        WorkItem: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 6,
    });

    return {
      cards: {
        projects: totalProjects,
        workItems: totalWorkItems,
        testCases: totalTestCases,
        automationScripts: totalAutomationScripts,
        executions: totalExecutions,
        scheduledRuns,
        analyticsAssistant: 1,
      },
      quality: {
        approvedTestCases,
        pendingTestCases,
        approvedAutomationScripts,
        passedExecutions,
        failedExecutions,
        passRate:
          totalExecutions > 0
            ? Math.round((passedExecutions / totalExecutions) * 100)
            : 0,
      },
      workItems: {
        ready: readyWorkItems,
        analyzed: analyzedWorkItems,
        failed: failedWorkItems,
      },
      recentProjects: recentProjects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        workItemCount: project.WorkItem.length,
        updatedAt: project.updatedAt,
      })),
    };
  }
}
