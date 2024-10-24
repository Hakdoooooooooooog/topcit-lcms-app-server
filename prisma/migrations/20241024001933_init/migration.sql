-- CreateTable
CREATE TABLE `chapters` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `topic_id` BIGINT NOT NULL,
    `parent_chapter_id` BIGINT NULL,
    `chapter_number` VARCHAR(55) NOT NULL,
    `title` TEXT NOT NULL,
    `sub_title` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_chapters_parent_id`(`parent_chapter_id`),
    INDEX `idx_chapters_topic_id`(`topic_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `chapter_id` BIGINT NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `chapter_id_UNIQUE`(`chapter_id`),
    INDEX `idx_files_chapter_id`(`chapter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `multiple_choice_options` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `objective_question_id` BIGINT NOT NULL,
    `option_text` VARCHAR(255) NOT NULL,

    INDEX `idx_multiple_choice_options_question_id`(`objective_question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `objective_questions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `quiz_id` BIGINT NOT NULL,
    `question` TEXT NOT NULL,
    `question_type` ENUM('multiple_choice', 'identification') NOT NULL,
    `correct_answer` VARCHAR(255) NULL,

    INDEX `idx_objective_questions_quiz_id`(`quiz_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `topic_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `quiz_type` ENUM('objective') NOT NULL DEFAULT 'objective',
    `max_attempts` INTEGER NULL DEFAULT 3,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_quizzes_topic_id`(`topic_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `topicTitle` VARCHAR(255) NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `name`(`topicTitle`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_completed_chapters` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `chapter_id` BIGINT NOT NULL,
    `completion_status` ENUM('not_started', 'in_progress', 'completed') NULL DEFAULT 'not_started',
    `completed_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_user_completed_lessons_chapter_id`(`chapter_id`),
    INDEX `idx_user_completed_lessons_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_identification_answers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `attempt_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `user_answer` TEXT NOT NULL,
    `is_correct` BOOLEAN NULL,

    INDEX `idx_user_identification_answers_attempt_id`(`attempt_id`),
    INDEX `idx_user_identification_answers_question_id`(`question_id`),
    INDEX `idx_user_identification_answers_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_multiple_choice_answers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `attempt_id` BIGINT NOT NULL,
    `question_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `user_selected_option_id` BIGINT NULL,
    `is_correct` BOOLEAN NULL,

    INDEX `idx_user_multiple_choice_answers_attempt_id`(`attempt_id`),
    INDEX `idx_user_multiple_choice_answers_question_id`(`question_id`),
    INDEX `idx_user_multiple_choice_answers_selected_option_id`(`user_selected_option_id`),
    INDEX `idx_user_multiple_choice_answers_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_progress` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `completed_lessons` INTEGER NULL DEFAULT 0,
    `completed_quizzes` INTEGER NULL DEFAULT 0,

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_quiz_attempts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `quiz_id` BIGINT NOT NULL,
    `attempt_count` INTEGER NULL DEFAULT 0,
    `score` INTEGER NULL DEFAULT 0,
    `time_taken` DATETIME(0) NULL,
    `completed_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `start_time` TIMESTAMP(0) NULL,
    `end_time` TIMESTAMP(0) NULL,

    INDEX `idx_user_quiz_attempts_quiz_id`(`quiz_id`),
    INDEX `idx_user_quiz_attempts_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_refresh_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `token` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `expires_at` TIMESTAMP(0) NOT NULL,

    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userID` BIGINT NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',

    UNIQUE INDEX `userID`(`userID`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_ibfk_2` FOREIGN KEY (`parent_chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `chapterFile` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `multiple_choice_options` ADD CONSTRAINT `multiple_choice_options_ibfk_1` FOREIGN KEY (`objective_question_id`) REFERENCES `objective_questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `objective_questions` ADD CONSTRAINT `objective_questions_ibfk_1` FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quiz` ADD CONSTRAINT `quiz_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_completed_chapters` ADD CONSTRAINT `user_completed_chapters_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_completed_chapters` ADD CONSTRAINT `user_completed_chapters_ibfk_2` FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_identification_answers` ADD CONSTRAINT `user_identification_answers_ibfk_1` FOREIGN KEY (`attempt_id`) REFERENCES `user_quiz_attempts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_identification_answers` ADD CONSTRAINT `user_identification_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `objective_questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_identification_answers` ADD CONSTRAINT `user_identification_answers_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_multiple_choice_answers` ADD CONSTRAINT `user_multiple_choice_answers_ibfk_1` FOREIGN KEY (`attempt_id`) REFERENCES `user_quiz_attempts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_multiple_choice_answers` ADD CONSTRAINT `user_multiple_choice_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `objective_questions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_multiple_choice_answers` ADD CONSTRAINT `user_multiple_choice_answers_ibfk_3` FOREIGN KEY (`user_selected_option_id`) REFERENCES `multiple_choice_options`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_multiple_choice_answers` ADD CONSTRAINT `user_multiple_choice_answers_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_quiz_attempts` ADD CONSTRAINT `user_quiz_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_quiz_attempts` ADD CONSTRAINT `user_quiz_attempts_ibfk_2` FOREIGN KEY (`quiz_id`) REFERENCES `quiz`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_refresh_tokens` ADD CONSTRAINT `user_refresh_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`userID`) ON DELETE CASCADE ON UPDATE NO ACTION;
