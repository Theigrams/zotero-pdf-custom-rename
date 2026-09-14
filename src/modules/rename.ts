import { config } from "../../package.json";
export { renameSelectedItems, renameItem, messageWindow };

function messageWindow(info: string, status: string) {
  new ztoolkit.ProgressWindow(config.addonName, {
    closeOnClick: true,
  })
    .createLine({
      text: info,
      type: status,
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    })
    .show();
}

async function renameItem(item: Zotero.Item) {
  const att: any = getAttachmentFromItem(item);
  if (!att || att === -1) {
    return;
  }
  await renameSpecificAttachment(item, att);
}

async function renameSpecificAttachment(parentItem: Zotero.Item, att: any) {
  const newAttName = getAttachmentName(parentItem);
  
  let currentFilename = att.attachmentFilename;
  if (!currentFilename && att.attachmentPath) {
     const pathParts = att.attachmentPath.split(/[\\/]/);
     currentFilename = pathParts[pathParts.length - 1];
  }

  let currentTitle = att.getField("title");
  
  if (currentFilename === newAttName && currentTitle === newAttName) {
    // Already named correctly
    return;
  }

  let status: any = true;
  if (currentFilename !== newAttName) {
    status = await att.renameAttachmentFile(newAttName);
  }

  if (status === true) {
    messageWindow(newAttName, "success");
    if (newAttName !== currentTitle) {
      att.setField("title", newAttName);
      await att.saveTx();
    }
  } else if (status === -1) {
    messageWindow("Destination file exists; use force to overwrite.", "fail");
  } else {
    messageWindow("Attachment file not found.", "fail");
  }
}

async function renameSelectedItems() {
  const activePane = Zotero.getActiveZoteroPane();
  if (!activePane) return;
  const items = activePane.getSelectedItems() || [];
  
  if (items.length === 0) {
    messageWindow("No items selected", "fail");
    return;
  } else if (items.length > 1) {
    messageWindow(" " + items.length + " items selected", "default");
  }

  for (const item of items as any[]) {
    if (item.isRegularItem()) {
      await renameItem(item);
    } else if (item.isAttachment()) {
      const parentItem = Zotero.Items.get(item.parentItemID || item.parentID);
      if (parentItem) {
        await renameSpecificAttachment(parentItem as Zotero.Item, item);
      }
    }
  }
}

function getSelectedItems() {
  const activePane = Zotero.getActiveZoteroPane();
  if (!activePane) return [];
  let items = activePane.getSelectedItems() || [];
  // get regular items
  let itemIds = items
    .filter((item: any) => item.isRegularItem())
    .map((item: any) => item.id as number);
  // get items from attachment
  const itemIdsFromAttachment = items
    .filter((item: any) => item.isAttachment())
    .map((item: any) => (item.parentItemID || item.parentID) as number);
  // remove duplicate items
  itemIds = itemIds.concat(itemIdsFromAttachment);
  itemIds = Zotero.Utilities.arrayUnique(itemIds);
  items = itemIds
    .map((id: number) => Zotero.Items.get(id) as Zotero.Item)
    .filter((item: any) => item);
  return items;
}

function getAttachmentFromItem(item: Zotero.Item): any {
  const oldTitle = item.getField("title").toString().slice(0, 10);
  const attachmentIDs = item.getAttachments();
  let attachments = attachmentIDs.map((id: number) => Zotero.Items.get(id));

  //   attachments = attachments.filter(att => att.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_FILE);
  const pdfAttachments = attachments.filter((att: any) => {
    return (
      att &&
      (att.attachmentContentType === "application/pdf" ||
        (att.attachmentFilename &&
          att.attachmentFilename.toLowerCase().endsWith(".pdf")))
    );
  });
  if (pdfAttachments.length === 0) {
    messageWindow("No attachments found for " + oldTitle, "fail");
    return -1;
  } else if (pdfAttachments.length > 1) {
    messageWindow(
      " " + pdfAttachments.length + " attachments found for " + oldTitle,
      "default"
    );
  }
  return pdfAttachments[0];
}

function getAttachmentName(item: Zotero.Item) {
  const jst = getJournalShortTitle(item);
  let shortTitle = item.getField("shortTitle");
  if (!shortTitle) {
    shortTitle = item.getField("title");
  }
  const safeGetField = (field: string): string => {
    try {
      return (item.getField(field) as string) || "";
    } catch {
      return "";
    }
  };

  const year = safeGetField("year");
  
  let author = "";
  try {
    const creators = item.getCreatorsJSON();
    if (creators && creators.length > 0) {
      const firstCreator = creators[0];
      author = firstCreator.lastName || firstCreator.name || firstCreator.firstName || "";
    }
  } catch (e) {
    author = "";
  }
  
  const publisher = safeGetField("publisher");
  const publication = safeGetField("publicationTitle");
  
  const namingFormat = Zotero.Prefs.get("pdfrename.namingFormat")?.toString() || "{{jst}}_{{year}}_{{shortTitle}}";
  let newFileName = namingFormat
    .replace(/\{\{jst\}\}/g, jst || "")
    .replace(/\{\{year\}\}/g, year || "")
    .replace(/\{\{shortTitle\}\}/g, shortTitle || "")
    .replace(/\{\{author\}\}/g, author || "")
    .replace(/\{\{publisher\}\}/g, publisher || "")
    .replace(/\{\{publication\}\}/g, publication || "");
  
  newFileName = `${newFileName}.pdf`;
  newFileName = Zotero.Utilities.cleanTags(newFileName);
  Zotero.debug("[renamePDF] New file name: " + newFileName);
  return newFileName;
}

function getJournalShortTitle(item: Zotero.Item) {
  const tags = item.getTags();
  // Find the tag that contains the journal short title
  // For example, the tag might be "Object { tag: "Jab/#IJCV" }"
  const journalTag = tags.find((tag) => tag.tag.startsWith("Jab/#"));
  let title = "";
  if (journalTag) {
    title = journalTag.tag.split("/#")[1];
    Zotero.debug("[renamePDF] Found journal short title from tag: " + title);
  } else {
    title = generateJournalShortTitle(item);
    Zotero.debug("[renamePDF] Generated journal short title: " + title);
    if (title !== "") {
      const taggingEnabled = Zotero.Prefs.get("pdfrename.tagging.enable");
      if (taggingEnabled !== false) {
        item.addTag("Jab/#" + title);
        item.saveTx();
      }
    }
  }
  return title;
}

function generateJournalShortTitle(item: Zotero.Item) {
  let jst = "Pre";
  if (item.itemType === "journalArticle") {
    const journalName = item.getField("publicationTitle").toString();
    if (journalName.includes("arXiv")) {
      return jst;
    }
    jst = firstLetterOfEachWord(journalName);
  } else if (item.itemType === "conferencePaper") {
    const conferenceName = item.getField("conferenceName").toString();
    // use abbreviations in parentheses
    const patt = /.*\((.+)\)/;
    jst = conferenceName?.match(patt)?.[1] ?? "";
    if (jst === "") {
      // use first letter of each word
      jst = firstLetterOfEachWord(conferenceName);
    }
  } else if (item.itemType === "bookSection") {
    const bookTitle = item.getField("bookTitle").toString();
    // if bookTitle contains "ECCV" or "ACCV", use it as the journal short title
    if (bookTitle.includes("ECCV")) {
      jst = "ECCV";
    } else if (bookTitle.includes("ACCV")) {
      jst = "ACCV";
    } else {
      jst = "Book";
    }
  }
  return jst;
}

function firstLetterOfEachWord(str: string) {
  if (str === "") {
    return "Pre";
  }
  // Use each capitalized initial letter of the journal title as an abbreviation
  const words = str.split(" ");
  // remove lowercase words and "IEEE", "ACM", "The", numbers, etc.
  const capitalizedWords = words.filter(
    (word) =>
      word[0] === word[0].toUpperCase() &&
      word !== "IEEE" &&
      word !== "ACM" &&
      word !== "The" &&
      !word.match(/\d+/)
  );
  // use first letter of each word as abbreviation
  const jab = capitalizedWords.map((word) => word[0]).join("");
  return jab;
}
