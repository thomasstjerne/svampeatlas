CREATE TABLE TaxonTags (
tag_id INT(11) NOT NULL,
taxon_id INT(11) NOT NULL,
createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY (tag_id, taxon_id),
FOREIGN KEY (tag_id) REFERENCES TaxonTagDescriptions (_id) ON DELETE CASCADE,
FOREIGN KEY (taxon_id) REFERENCES Taxon (_id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET=UTF8;

CREATE VIEW TaxonomyTagView AS select taxon_id, tag_id,  tagname, tagowner FROM TaxonTagDescriptions c JOIN TaxonTags g ON g.tag_id = c._id;