import React from 'react';
import { Composition } from 'remotion';
import { QuizCreateTutorial } from './compositions/QuizCreateTutorial';
import { QuizTakeTutorial } from './compositions/QuizTakeTutorial';
import { QuizExtensionTutorial } from './compositions/QuizExtensionTutorial';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="QuizCreateTutorial"
        component={QuizCreateTutorial}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QuizTakeTutorial"
        component={QuizTakeTutorial}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="QuizExtensionTutorial"
        component={QuizExtensionTutorial}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
