import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { Card, CardBody } from './ui/Card'; // Assuming Card components exist

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: IconDefinition;
  change?: string;
  changeType?: 'increase' | 'decrease';
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType,
  className = '',
}) => {
  const changeIcon = changeType === 'increase' ? faArrowUp : faArrowDown;
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  return (
    <Card className={`shadow-md ${className}`}>
      <CardBody className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-jdc-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
          {change && changeType && (
            <p className={`text-xs mt-1 flex items-center ${changeColor}`}>
              <FontAwesomeIcon icon={changeIcon} className="mr-1" />
              {change} {changeType === 'increase' ? 'depuis hier' : 'depuis hier'} {/* Adjust text as needed */}
            </p>
          )}
        </div>
        <div className="bg-jdc-yellow text-jdc-black rounded-full p-3">
          <FontAwesomeIcon icon={icon} size="lg" />
        </div>
      </CardBody>
    </Card>
  );
};
