import React from 'react';
import { Composition } from 'remotion';
import { ProductDemoVideo } from './compositions/ProductDemo/ProductDemoVideo';
import '../index.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OSFlowProductDemo"
        component={ProductDemoVideo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
