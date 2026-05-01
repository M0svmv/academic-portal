exports.uniqueByString = (arr = []) => {
  return arr.filter(
    (item, index, self) =>
      index === self.findIndex((x) => x.toString() === item.toString())
  );
};