// The public view never reads or writes a visitor's local draft.
export function createDraftStorage(getStorage, maintenance) {
  return {
    read(key) {
      return maintenance ? getStorage().getItem(key) : null;
    },
    write(key, value) {
      if (!maintenance) throw new Error('只读模式不能保存草稿。');
      getStorage().setItem(key, value);
    },
  };
}
