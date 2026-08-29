# Real-Time Sign Language Interpreter

A web application that translates hand signs into text and speech in real time, using MediaPipe for hand tracking and an LSTM model for gesture recognition.

## Overview

This project aims to bridge communication gaps for the hearing and speech impaired by recognizing sign language gestures through a webcam and converting them into text and spoken output in real time.

## Tech Stack

- **Frontend:** React
- **Backend:** Flask REST API
- **Hand Tracking:** MediaPipe Hands
- **Gesture Recognition:** TensorFlow/Keras LSTM
- **Speech Output:** Speech synthesis engine

## Features

- Real-time webcam-based hand tracking
- Recognizes ASL alphabet (A–Z)
- Converts recognized signs into text and speech
- Sequence-based gesture recognition using LSTM

## Project Structure

    backend/ai-service/   → Model training, inference pipeline, MediaPipe processing
    frontend/             → React-based user interface

## Dataset

Letter recognition (A–Z) is trained on real hand-landmark data extracted from the Kaggle ASL Alphabet dataset using MediaPipe. Dataset files are not included in this repo due to size — see `backend/ai-service/data/README.md` for instructions to regenerate them.

## Status

Actively in development — letter recognition (A–Z) trained on real Kaggle ASL Alphabet data. Word-sign recognition is in progress, with more signs being added over time.

## Team

- Mohammed Owais Alam
- Niranjan M
- Raman Bharadwaj

## Institution

M S Ramaiah College of Arts, Science and Commerce (MSRCASC), Bengaluru — BCA Final Year Project
