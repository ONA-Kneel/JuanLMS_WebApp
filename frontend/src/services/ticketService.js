import axios from 'axios';

export const createTicket = (data) => axios.post('/api/tickets', data).then(res => res.data);
export const getUserTickets = (userId) => axios.get(`/api/tickets/user/${userId}`).then(res => res.data);
export const getTicketByNumber = (number) => axios.get(`/api/tickets/number/${number}`).then(res => res.data);
export const getAllTickets = (status) => axios.get('/api/tickets', { params: status ? { status } : {} }).then(res => res.data);
export const replyToTicket = (ticketId, data) => axios.post(`/api/tickets/${ticketId}/reply`, data).then(res => res.data); 