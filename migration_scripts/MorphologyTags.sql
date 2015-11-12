CREATE TABLE MorphologyTags (
_id INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
tagname_da VARCHAR(255),
tagname_uk VARCHAR(255),
description text,
icon1 VARCHAR(255),
icon2 VARCHAR(255)
) ENGINE = InnoDB DEFAULT CHARSET= UTF8;