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

type ContactPayload = Record<{
  name: string;
  phoneNumber: string;
  email: string;
  category: string;
  address: string;
}>;

const contactStorage = new StableBTreeMap<string, Contact>(0, 44, 1024);

function authenticateCaller(): Principal | null {
  // Implement authentication logic here to verify the caller's identity.
  // Return the Principal if authenticated, or null if not.
  // Example: You can use a JWT or other authentication mechanism.
  return null; // Replace with actual authentication logic.
}

function isAuthorized(owner: Principal, caller: Principal): boolean {
  // Implement authorization logic here to check if the caller has permission to perform actions.
  // Example: Check if the caller is the owner of the contact.
  return owner.toString() === caller.toString();
}

export function createContact(payload: ContactPayload): Result<Contact, string> {
  const caller = authenticateCaller();
  if (!caller) {
    return Result.Err<Contact, string>("Authentication failed.");
  }

  // Validate input data
  if (!payload.name || !payload.phoneNumber || !payload.email || !payload.category || !payload.address) {
    return Result.Err<Contact, string>("Invalid input data.");
  }

  const contact: Contact = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
    owner: caller,
  };

  contactStorage.insert(contact.id, contact);
  return Result.Ok<Contact, string>(contact);
}

export function getContact(id: string): Result<Contact, string> {
  const caller = authenticateCaller();
  if (!caller) {
    return Result.Err<Contact, string>("Authentication failed.");
  }

  const contact = contactStorage.get(id);

  if (!contact) {
    return Result.Err<Contact, string>(`Contact with id=${id} not found.`);
  }

  if (!isAuthorized(contact.owner, caller)) {
    return Result.Err<Contact, string>("Unauthorized access to contact.");
  }

  return Result.Ok<Contact, string>(contact);
}

export function updateContact(id: string, payload: ContactPayload): Result<Contact, string> {
  const caller = authenticateCaller();
  if (!caller) {
    return Result.Err<Contact, string>("Authentication failed.");
  }

  const existingContact = contactStorage.get(id);

  if (!existingContact) {
    return Result.Err<Contact, string>(`Contact with id=${id} not found.`);
  }

  if (!isAuthorized(existingContact.owner, caller)) {
    return Result.Err<Contact, string>("Unauthorized access to contact.");
  }

  // Validate input data
  if (!payload.name || !payload.phoneNumber || !payload.email || !payload.category || !payload.address) {
    return Result.Err<Contact, string>("Invalid input data.");
  }

  const updatedContact: Contact = {
    ...existingContact,
    ...payload,
    updatedAt: Opt.Some(ic.time()),
  };

  contactStorage.insert(updatedContact.id, updatedContact);
  return Result.Ok<Contact, string>(updatedContact);
}

export function deleteContact(id: string): Result<Contact, string> {
  const caller = authenticateCaller();
  if (!caller) {
    return Result.Err<Contact, string>("Authentication failed.");
  }

  const existingContact = contactStorage.get(id);

  if (!existingContact) {
    return Result.Err<Contact, string>(`Contact with id=${id} not found.`);
  }

  if (!isAuthorized(existingContact.owner, caller)) {
    return Result.Err<Contact, string>("Unauthorized access to contact.");
  }

  contactStorage.remove(id);
  return Result.Ok<Contact, string>(existingContact);
}

export function getAllContacts(): Result<Vec<Contact>, string> {
  const caller = authenticateCaller();
  if (!caller) {
    return Result.Err<Vec<Contact>, string>("Authentication failed.");
  }

  const contacts = contactStorage.values().filter((contact) => isAuthorized(contact.owner, caller));
  return Result.Ok<Vec<Contact>, string>(contacts);
}
