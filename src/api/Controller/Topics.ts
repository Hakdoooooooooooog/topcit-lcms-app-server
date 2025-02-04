import { Request, Response } from "express";
import {
  getAllTopics,
  getAllTopicsWithChapters,
  checkTopicExists,
  createTopic,
  updateTopic,
} from "../db/Topics";
import { serializeBigInt } from "../services";

export const Topics = async (req: Request, res: Response) => {
  try {
    const topics = await getAllTopics();
    res.status(200).json(serializeBigInt(topics));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const TopicsWithAllChapters = async (req: Request, res: Response) => {
  try {
    const allTopicsWithChapter = await getAllTopicsWithChapters();

    res.status(200).json(serializeBigInt(allTopicsWithChapter));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const CreateTopic = async (req: Request, res: Response) => {
  const { topicNum, topicName, topicDescription } = req.body;

  if (!topicNum || !topicName || !topicDescription) {
    res.status(400).json({
      message: "Please provide all the required fields",
    });
    return;
  }

  try {
    const result = await checkTopicExists(topicNum);

    if (result) {
      res.status(409).json({
        message: "Topic already exists",
      });
      return;
    }

    const resultCreate = await createTopic(topicName, topicDescription);

    if (resultCreate) {
      res.status(201).json({
        message: "Topic created successfully",
      });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const UpdateTopic = async (req: Request, res: Response) => {
  const topic_id = req.params.topic_id;
  const { topicTitle, description } = req.body;

  if (!topic_id || !topicTitle || !description) {
    res.sendStatus(400);
    return;
  }

  try {
    const topic = await updateTopic(Number(topic_id), topicTitle, description);

    if (!topic) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }

    res.status(200).json({ message: "Topic updated" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
