import { config } from "../../package.json";
export { renameSelectedItems, messageWindow };

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

async function renameSelectedItems() {
  const items = getSelectedItems();
  if (items.length === 0) {
    messageWindow("No items selected", "fail");
    return;
  } else if (items.length > 1) {
    messageWindow(" " + items.length + " items selected", "default");
  }

  for (const item of items) {
    const att = getAttachmentFromItem(item);
    if (att === -1) {
      continue;
    }
    const newAttName = getAttachmentName(item);
    const status = await att.renameAttachmentFile(newAttName);
    if (status === true) {
      messageWindow(newAttName, "success");
      if (newAttName !== att.getField("title")) {
        att.setField("title", newAttName);
        att.saveTx();
      }
    } else if (status === -1) {
      messageWindow("Destination file exists; use force to overwrite.", "fail");
    } else {
      messageWindow("Attachment file not found.", "fail");
    }
  }
}

function getSelectedItems() {
  let items = Zotero.getActiveZoteroPane().getSelectedItems();
  // get regular items
  let itemIds = items
    .filter((item) => item.isRegularItem())
    .map((item) => item.id as number);
  // get items from attachment
  const itemIdsFromAttachment = items
    .filter((item) => item.isAttachment())
    .map((item) => item.parentItemID as number);
  // remove duplicate items
  itemIds = itemIds.concat(itemIdsFromAttachment);
  itemIds = Zotero.Utilities.arrayUnique(itemIds);
  items = itemIds.map((id) => Zotero.Items.get(id));
  return items;
}

function getAttachmentFromItem(item: Zotero.Item) {
  const oldTitle = item.getField("title").toString().slice(0, 10);
  const attachmentIDs = item.getAttachments();
  const attachments = attachmentIDs.map((id) => Zotero.Items.get(id));

  //   attachments = attachments.filter(att => att.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_FILE);
  const pdfAttachments = attachments.filter((att) => {
    return (
      att.attachmentContentType === "application/pdf" ||
      (att.attachmentFilename &&
        att.attachmentFilename.toLowerCase().endsWith(".pdf"))
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
  const year = item.getField("year");
  let newFileName = `${jst}_${year}_${shortTitle}.pdf`;
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
      item.addTag("Jab/#" + title);
      item.saveTx();
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
