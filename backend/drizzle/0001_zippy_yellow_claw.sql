CREATE TABLE `activityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`botAccountId` int NOT NULL,
	`actionType` enum('like','comment','share','follow','browse','login','logout') NOT NULL,
	`targetPostUrl` varchar(500),
	`targetPageUrl` varchar(500),
	`logStatus` enum('success','failed','pending') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `botAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`facebookEmail` varchar(255) NOT NULL,
	`facebookUsername` varchar(255) NOT NULL,
	`facebookPasswordEncrypted` text NOT NULL,
	`status` enum('warming','active','paused','banned','inactive') NOT NULL DEFAULT 'warming',
	`warmupPhase` int NOT NULL DEFAULT 1,
	`daysActive` int NOT NULL DEFAULT 0,
	`lastActivityAt` timestamp,
	`proxyId` int,
	`todayLikes` int NOT NULL DEFAULT 0,
	`todayComments` int NOT NULL DEFAULT 0,
	`todayShares` int NOT NULL DEFAULT 0,
	`todayFollows` int NOT NULL DEFAULT 0,
	`totalLikes` int NOT NULL DEFAULT 0,
	`totalComments` int NOT NULL DEFAULT 0,
	`totalShares` int NOT NULL DEFAULT 0,
	`totalFollows` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `botAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`facebookPageUrl` varchar(500) NOT NULL,
	`facebookPageId` varchar(100),
	`targetFollowers` int NOT NULL DEFAULT 0,
	`targetLikes` int NOT NULL DEFAULT 0,
	`targetComments` int NOT NULL DEFAULT 0,
	`targetShares` int NOT NULL DEFAULT 0,
	`currentFollowers` int NOT NULL DEFAULT 0,
	`currentLikes` int NOT NULL DEFAULT 0,
	`currentComments` int NOT NULL DEFAULT 0,
	`currentShares` int NOT NULL DEFAULT 0,
	`status` enum('draft','active','paused','completed','failed') NOT NULL DEFAULT 'draft',
	`progress` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proxies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('mobile','residential','datacenter') NOT NULL,
	`address` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`username` varchar(255),
	`passwordEncrypted` text,
	`proxyStatus` enum('active','inactive','unhealthy') NOT NULL DEFAULT 'active',
	`successRate` int NOT NULL DEFAULT 100,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proxies_id` PRIMARY KEY(`id`)
);
