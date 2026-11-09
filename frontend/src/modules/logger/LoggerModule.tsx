import React from 'react';
import { NurseActivityLogger } from './index';
import { AuthUser } from '../../types';

export interface LoggerModuleProps {
  currentUser?: AuthUser | null;
}

export const LoggerModule: React.FC<LoggerModuleProps> = ({ currentUser }) => {
  return <NurseActivityLogger currentUser={currentUser} />;
};

export default LoggerModule;
