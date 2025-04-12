import React from 'react';
import { Link } from '@remix-run/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicket, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Card, CardHeader, CardBody } from './ui/Card'; // Assuming Card components exist
import { Button } from './ui/Button';

interface Ticket {
  id: string;
  client: string;
  status: string;
  date: string; // Consider using Date object if needed
}

interface RecentTicketsProps {
  tickets: Ticket[];
  className?: string;
}

const statusColors: Record<string, string> = {
  'Ouvert': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'En cours': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Fermé': 'bg-green-500/20 text-green-400 border border-green-500/30',
};

export const RecentTickets: React.FC<RecentTicketsProps> = ({ tickets, className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <FontAwesomeIcon icon={faTicket} className="mr-2 text-jdc-yellow" />
          Tickets SAP Récents
        </h2>
        <Button as="link" to="/tickets-sap" variant="ghost" size="sm" rightIcon={<FontAwesomeIcon icon={faArrowRight} />}>
          Voir tout
        </Button>
      </CardHeader>
      <CardBody className="p-0"> {/* Remove padding for full-width list */}
        {tickets.length === 0 ? (
          <p className="text-jdc-gray-400 text-center py-4 px-6">Aucun ticket récent.</p>
        ) : (
          <ul className="divide-y divide-jdc-gray-800">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="px-4 py-3 sm:px-6 hover:bg-jdc-gray-800/50 transition-colors">
                <Link to={`/tickets-sap/${ticket.id}`} className="block"> {/* Link to specific ticket */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white truncate">{ticket.client} - <span className="text-jdc-gray-300">#{ticket.id}</span></p>
                    <p className="text-xs text-jdc-gray-400">{ticket.date}</p>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                      {ticket.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
};
