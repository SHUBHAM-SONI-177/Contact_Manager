// Import necessary modules
import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the Contact record structure
type Contact = Record<{
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  category: string;
  address: string;
  owner: Principal;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the payload for creating a new Contact record
type ContactPayload = Record<{
  name: string;
  phoneNumber: string;
  email: string;
  category: string;
  address: string;
}>;

// Create a storage container for contacts
const contactStorage = new StableBTreeMap<string, Contact>(0, 44, 1024);
  
// Function to create a new Contact record
$update;
export function createContact(payload: ContactPayload): Result<Contact, string> {
  // Payload validation: Check if required fields in the payload are missing
  if (!payload.name || !payload.phoneNumber || !payload.email || !payload.category || !payload.address) {
    return Result.Err<Contact, string>("Missing required fields in payload");
  }

  // Create a new Contact object
  const contact: Contact = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    name: payload.name,
    phoneNumber: payload.phoneNumber,
    email: payload.email,
    category: payload.category,
    address: payload.address,
    owner: ic.caller(),
  };

  try {
    // Insert the new Contact record into storage
    contactStorage.insert(contact.id, contact);
  } catch (error) {
    return Result.Err<Contact, string>("Error occurred during contact insertion");
  }

  return Result.Ok<Contact, string>(contact);
}
  
// Function to retrieve a Contact by its ID
$query;
export function getContact(id: string): Result<Contact, string> {
  // Parameter validation: Check if ID is invalid or missing
  if (!id) {
    return Result.Err<Contact, string>(`Invalid id=${id}.`);
  }
  try {
    return match(contactStorage.get(id), {
      Some: (contact) => Result.Ok<Contact, string>(contact),
      None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
    });
  } catch (error) {
    return Result.Err<Contact, string>(`Error while retrieving contact with id ${id}`);
  }
}

// Function to retrieve a Contact by its name (case-insensitive)
$query;
export function getContactByName(name: string): Result<Contact, string> {
  const contacts = contactStorage.values();

  // Case-insensitive search for the contact by name
  const foundContact = contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase());

  if (foundContact) {
    return Result.Ok<Contact, string>(foundContact);
  }

  return Result.Err<Contact, string>(`Contact with name="${name}" not found.`);
}

// Function to retrieve Contacts by category (case-insensitive)
$query;
export function getContactsByCategory(category: string): Result<Vec<Contact>, string> {
  const contacts = contactStorage.values();

  // Case-insensitive filter for contacts by category
  const filteredContacts = contacts.filter((contact) => contact.category.toLowerCase() === category.toLowerCase());

  if (filteredContacts.length > 0) {
    return Result.Ok<Vec<Contact>, string>(filteredContacts);
  }

  return Result.Err<Vec<Contact>, string>(`No contacts found in category="${category}".`);
}

// Function to retrieve all Contacts
$query;
export function getAllContacts(): Result<Vec<Contact>, string> {
  try {
    return Result.Ok(contactStorage.values());
  } catch (error) {
    return Result.Err(`Failed to get all contacts: ${error}`);
  }
}

// Function to update a Contact record
$update;
export function updateContact(id: string, payload: ContactPayload): Result<Contact, string> {
  // Parameter validation: Check if ID is invalid or missing
  if (!id) {
    return Result.Err<Contact, string>('Invalid id.');
  }

  // Payload validation: Check if required fields in the payload are missing
  if (!payload.name || !payload.phoneNumber || !payload.email || !payload.category || !payload.address) {
    return Result.Err<Contact, string>('Missing required fields in payload.');
  }

  return match(contactStorage.get(id), {
    Some: (existingContact) => {
      // Create an updated Contact object
      const updatedContact: Contact = {
        id: existingContact.id,
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        category: payload.category,
        address: payload.address,
        owner: existingContact.owner,
        createdAt: existingContact.createdAt,
        updatedAt: Opt.Some(ic.time()),
      };

      try {
        // Update the Contact record in storage
        contactStorage.insert(updatedContact.id, updatedContact);
        return Result.Ok<Contact, string>(updatedContact);
      } catch (error) {
        return Result.Err<Contact, string>(`Error updating contact: ${error}`);
      }
    },

    None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
  });
}

// Function to delete a Contact by its ID
$update;
export function deleteContact(id: string): Result<Contact, string> {
  // Parameter validation: Check if ID is invalid or missing
  if (!id) {
    return Result.Err<Contact, string>(`Invalid id=${id}.`);
  }
  try {
    return match(contactStorage.get(id), {
      Some: (existingContact) => {
        // Check if the caller is the owner of the Contact
        if (existingContact.owner.toString() === ic.caller.toString()) {
          return Result.Err<Contact, string>("User does not have the right to delete contact");
        }

        // Remove the Contact from storage
        contactStorage.remove(id);
        return Result.Ok<Contact, string>(existingContact);
      },
      None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
    });
  } catch (error) {
    return Result.Err<Contact, string>(`Error deleting contact with id=${id}: ${error}`);
  }
}

// Set up a random number generator for generating UUIDs
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
