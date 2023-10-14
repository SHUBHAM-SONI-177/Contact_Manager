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
  
  $update;
  export function createContact(payload: ContactPayload): Result<Contact, string> {
    const contact: Contact = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      ...payload,
      owner: ic.caller(),
    };
  
    contactStorage.insert(contact.id, contact);
    return Result.Ok<Contact, string>(contact);
  }
  
  $query;
  export function getContact(id: string): Result<Contact, string> {
    return match(contactStorage.get(id), {
      Some: (contact) => Result.Ok<Contact, string>(contact),
      None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
    });
  }
  
  $query;
  export function getContactByName(name: string): Result<Contact, string> {
    const contacts = contactStorage.values();
  
    const foundContact = contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase());
  
    if (foundContact) {
      return Result.Ok<Contact, string>(foundContact);
    }
  
    return Result.Err<Contact, string>(`Contact with name="${name}" not found.`);
  }
  
  $query;
  export function getContactsByCategory(category: string): Result<Vec<Contact>, string> {
    const contacts = contactStorage.values();
  
    const filteredContacts = contacts.filter((contact) => contact.category.toLowerCase() === category.toLowerCase());
  
    if (filteredContacts.length > 0) {
      return Result.Ok<Vec<Contact>, string>(filteredContacts);
    }
  
    return Result.Err<Vec<Contact>, string>(`No contacts found in category="${category}".`);
  }
  
  $query;
  export function getAllContacts(): Result<Vec<Contact>, string> {
    return Result.Ok(contactStorage.values());
  }
  
  $update;
  export function updateContact(id: string, payload: ContactPayload): Result<Contact, string> {
    return match(contactStorage.get(id), {
      Some: (existingContact) => {
        const updatedContact: Contact = {
          ...existingContact,
          ...payload,
          updatedAt: Opt.Some(ic.time()),
        };
  
        contactStorage.insert(updatedContact.id, updatedContact);
        return Result.Ok<Contact, string>(updatedContact);
      },
      None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
    });
  }
  
  $update;
  export function deleteContact(id: string): Result<Contact, string> {
    return match(contactStorage.get(id), {
      Some: (existingContact) => {
        contactStorage.remove(id);
        return Result.Ok<Contact, string>(existingContact);
      },
      None: () => Result.Err<Contact, string>(`Contact with id=${id} not found.`),
    });
  }
  
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
  
