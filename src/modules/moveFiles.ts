/**
ZotFile: Advanced PDF management for Zotero
Joscha Legewie

Zotfile is a Zotero plugin to manage your attachments:
automatically rename, move, and attach PDFs (or other files)
to Zotero items, sync PDFs from your Zotero library to your (mobile)
PDF reader (e.g. an iPad, Android tablet, etc.) and extract
annotations from PDF files.

Webpage: http://www.zotfile.com
Github: https://github.com/jlegewie/zotfile

License
The source code is released under GNU General Public License, version 3.0
Contributions preferably through pull requests are welcome!

Zotero JavaScript API
http://www.zotero.org/support/dev/client_coding/javascript_api
*/

import { config } from "../../package.json";
export { moveFile };

function infoWindow(info: string, status: string) {
  new ztoolkit.ProgressWindow(config.addonName + ": Move File", {
    closeOnClick: true,
  })
    .createLine({
      text: info,
      type: status,
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
    })
    .show();
}

/**
 * Rename attachment file based on parent item metadata.
 * @param  {Zotero.Item} att       Zotero attachment item.
 * @param  {bool}        imported  Create imported Zotero attachment.
 * @param  {bool}        rename    Rename attachment file.
 * @param  {string}      folder    Custom location if not imported attachment.
 * @param  {bool}        verbose   Notification about renaming.
 * @return {Zotero.Item}           Zotero item for renamed attachment.
 */
async function renameAttachment(
  att: Zotero.Item,
  imported: boolean,
  rename: boolean,
  folder: string,
  verbose: boolean
): Promise<Zotero.Item> {
  // only proceed imported attachment
  const linkmode = att.attachmentLinkMode;
  if (linkmode !== Zotero.Attachments.LINK_MODE_IMPORTED_FILE) {
    throw "Attachment is not a imported file";
  }
  const path = await att.getFilePathAsync();
  if (!path) {
    throw "Attachment file not found";
  }
  // For imported attachments, move the file and link to it
  const newPath = OS.Path.join(folder, att.attachmentFilename);
  //   let options = { file: newPath };
  return att;
}

/**
 * Move file to new location
 * @param  {String} sourcePath  File to move.
 * @param  {String} targetDir   Target directory or full path.
 * @param  {String} filename    Name of file.
 * @return {String | false}        Attachment item.
 */
async function moveFile(
  sourcePath: string,
  targetDir: string,
  filename: string
): Promise<string | false> {
  // check function arguments
  if (!(await OS.File.exists(sourcePath))) {
    infoWindow("File does not exist", "fail");
    return false;
  }
  let targetPath = OS.Path.join(targetDir, filename);
  // return if already at target
  if (sourcePath == targetPath) return targetPath;
  // add suffix if target path exists
  let k = 2;
  while (await OS.File.exists(targetPath)) {
    targetPath = addNumericalSuffix(targetPath, k);
    if (sourcePath == targetPath) return targetPath;
    k++;
    if (k > 10)
      throw "'Zotero.ZotFile.moveFile()': '" + filename + "' already exists.";
  }
  // move file to new location
  await OS.File.move(sourcePath, targetPath);
  // delete empty folders after moving file
  const sourceDir = OS.Path.normalize(sourcePath);
  removeFile(sourceDir);
  return targetPath;
}

/**
 * Add numerical suffix to filename
 * @param {string}  filename The filename
 * @param {number}  k        The suffix
 */
function addNumericalSuffix(filename: string, k: number) {
  return filename.replace(/(\d{1,3})?(\.[\w\d]*)$/i, k + "$2");
}

/**
 * Delete file or folder
 * @param  {nsIFile|String} file File or folder to be removed as nsIFile object
 * @return {void}
 */
function removeFile(file: nsIFile | string): void {
  file = Zotero.File.pathToFile(file);
  if (!file.exists()) return;
  try {
    // remove file
    if (!file.isDirectory()) {
      file.remove(false);
    }
    // ... for directories, remove them if no non-hidden files are inside
    else {
      const entries = file.directoryEntries;
      while (entries.hasMoreElements()) {
        const entry = entries
          .getNext()
          .QueryInterface(Components.interfaces.nsIFile.nsIFile);
        if (!entry.isHidden()) {
          return;
        }
      }
      file.remove(false);
    }
  } catch (e) {
    if (file.isDirectory()) {
      Zotero.debug("Could not remove directory " + file.path);
    }
  }
}

/**
 * Move a linked attachment to a new location
 * (mostly adopted from `Zotero.Item.prototype.renameAttachmentFile` )
 * @param  {Zotero.Item} att       Zotero attachment to move
 * @param  {string}      location  Folder
 * @param  {string}      filename  Filename
 * @return {bool}                  Indicates whether successful
 */
function moveLinkedAttachmentFile(
  att: Zotero.Item,
  location: string,
  filename: string
): boolean {
  if (att.attachmentLinkMode !== Zotero.Attachments.LINK_MODE_LINKED_FILE) {
    infoWindow("Attachment is not a linked file", "fail");
    return false;
  }
  att.getFilePathAsync();
  return true;
}

/**
 * Get filename based on metadata from zotero item
 * @param  {Zotero.Item}  item   Zotero item for metadata
 * @param  {string}       name   Current filename as fallback and for extension
 * @param  {string}       format Formatting rules based on wildcards
 * @return {string}              Formatted filename with extension
 */
function getFilename(item: Zotero.Item, name: string, format: string): string {
  return "test.pdf";
}

/**
 * Function to get location of file based on zotero item metadata
 * @param  {string}      basefolder Basefolder
 * @param  {Zotero.Item} item       Zotero item  for metadata
 * @param  {string}      format     Rule to construct subfolder with wildcards (e.g. '%j/%y')
 * @return {string}                 Folder path
 */
function getLocation(
  basefolder: string,
  item: Zotero.Item,
  format: string
): string {
  // check function arguments
  if (!item.isRegularItem()) throw "getLocation: Not regular zotero item.";
  if (typeof basefolder != "string")
    throw "getLocation: 'basefolder' not string.";
  if (typeof format != "string") throw "getLocation: 'format' not string.";
  return OS.Path.normalize(basefolder);
}
