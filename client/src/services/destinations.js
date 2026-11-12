// Shared destination data. Used by every destination dropdown so that travellers can always type their own place.
export const OTHER_DESTINATION = "__other_destination__";

export const popularDestinations = [
  "Agra", "Alappuzha", "Amritsar", "Andaman Islands", "Ayodhya", "Bengaluru", "Bhopal", "Chandigarh", "Chennai",
  "Coorg", "Darjeeling", "Dehradun", "Delhi", "Dharamshala", "Gangtok", "Goa", "Haridwar", "Hyderabad", "Jaipur",
  "Jaisalmer", "Jodhpur", "Kashmir", "Kochi", "Kolkata", "Leh-Ladakh", "Manali", "Mumbai", "Munnar", "Mysuru",
  "Nainital", "Ooty", "Puducherry", "Rishikesh", "Shimla", "Udaipur", "Varanasi",
];

export const uniqueSorted = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
