# DescribeFlowTemplates - 查询模板信息

## 1. 接口描述

**接口请求域名**：`ess.tencentcloudapi.com`

此接口用于查询本企业模板列表信息。

### 适用场景

该接口常用来配合模板发起合同-创建电子文档接口，作为创建电子文档的前置接口使用。通过此接口查询到模板信息后，再通过调用创建电子文档接口，指定模板ID，指定模板中需要的填写控件内容等，完成电子文档的创建。

### 模板结构信息

一个模板通常会包含以下结构信息：

- **模板基本信息**：模板ID、模板名字等
- **发起方参与信息**（Promoter）：发起方参与信息
- **签署参与方**（Recipients）：后者会在模板发起合同时用于指定参与方
- **填写控件**（Components）：发起方和签署方的填写控件
- **签署控件**（SignComponents）：签署方的签署控件

模板中各元素的层级关系：所有的填写控件和签署控件都归属某一个角色（通过控件的 `ComponentRecipientId` 来关联）。

**默认接口请求频率限制**：300次/秒

**推荐使用**：[API Explorer](https://console.cloud.tencent.com/api/explorer?Product=ess&Version=2020-11-11&Action=DescribeFlowTemplates)

---

## 2. 输入参数

以下请求参数列表仅列出了接口请求参数和部分公共参数，完整公共参数列表见[公共请求参数](https://qian.tencent.com/developers/companyApis/apiGuides/commonParams)。

| 参数名称 | 必选 | 类型 | 描述 |
|---------|------|------|------|
| Action | 是 | String | [公共参数](https://qian.tencent.com/developers/companyApis/apiGuides/commonParams)，本接口取值：`DescribeFlowTemplates` |
| Version | 是 | String | [公共参数](https://qian.tencent.com/developers/companyApis/apiGuides/commonParams)，本接口取值：`2020-11-11` |
| Region | 否 | String | [公共参数](https://qian.tencent.com/developers/companyApis/apiGuides/commonParams)，此参数为可选参数 |
| Operator | 是 | UserInfo | 执行本接口操作的员工信息。注：在调用此接口时，请确保指定的员工已获得所需的接口调用权限，并具备接口传入的相应资源的数据权限 |
| Agent | 否 | Agent | 代理企业和员工的信息。在集团企业代理子企业操作的场景中，需设置此参数。在此情境下，ProxyOrganizationId（子企业的组织ID）为必填项 |
| ContentType | 否 | Integer | 查询内容控制<br/>**0**：模板列表及详情（默认）<br/>**1**：仅模板列表<br/>示例值：1 |
| Filters.N | 否 | Array of Filter | 搜索过滤的条件，本字段允许您通过指定模板 ID 或模板名称来进行查询。<br/><br/>**模板 ID**：**Key**设置为 `template-id`，**Values**为您想要查询的模板ID列表。<br/><br/>**主企业模板 ID**：**Key**设置为 `share-template-id`，**Values**为您想要查询的主企业模板ID列表。用来查询主企业分享模板到子企业场景下，子企业的模板信息，在此情境下，参数 **Agent.ProxyOrganizationId**（子企业的组织ID）为必填项。<br/><br/>**模板名称**：**Key**设置为 `template-name`，**Values**为您想要查询的模板名称列表。<br/><br/>**模板的用户合同类型**：**Key**设置为 `user-flow-type-id`，**Values**为您想要查询的用户模板类型id列表 |
| Offset | 否 | Integer | 查询结果分页返回，指定从第几页返回数据，和Limit参数配合使用。<br/>注：1.offset从0开始，即第一页为0。2.默认从第一页返回。<br/>示例值：0 |
| Limit | 否 | Integer | 指定每页返回的数据条数，和Offset参数配合使用。<br/>注：1.默认值为20，单页最大值为200。<br/>示例值：20 |
| ApplicationId | 否 | String | 通过指定第三方应用的应用号来查询该应用下的模板列表 |

---

## 3. 输出参数

| 参数名称 | 类型 | 描述 |
|---------|------|------|
| Templates | Array of TemplateInfo | 模板详情列表数据 |
| TotalCount | Integer | 查询到的模板总数 |

### TemplateInfo 结构说明

| 参数名称 | 类型 | 描述 |
|---------|------|------|
| TemplateId | String | 模板ID |
| TemplateName | String | 模板名称 |
| TemplateType | Integer | 模板类型：<br/>0：普通模板<br/>1：特殊模板 |
| TemplateVersion | String | 模板版本号 |
| CreatedOn | Integer | 模板创建时间戳 |
| Recipients | Array of Recipient | 签署参与者信息 |
| Components | Array of Component | 模板中的填写控件列表 |
| SignComponents | Array of Component | 模板中的签署控件列表 |
| Promoter | Recipient | 发起方的角色信息 |

### Component 结构说明

| 参数名称 | 类型 | 描述 |
|---------|------|------|
| ComponentId | String | 控件ID |
| ComponentName | String | 控件名称 |
| ComponentType | String | 控件类型，支持以下类型：<br/>- `TEXT`：单行文本<br/>- `MULTI_LINE_TEXT`：多行文本<br/>- `DATE`：日期<br/>- `SELECT`：选择框<br/>- `SIGN_SIGNATURE`：手写签名<br/>- `SIGN_SEAL`：印章<br/>- `SIGN_DATE`：签署日期 |
| ComponentRequired | Boolean | 是否必填 |
| ComponentRecipientId | String | 控件所属的参与方ID |
| ComponentValue | String | 控件值（如果已填写） |
| Placeholder | String | 占位符提示信息 |
| Options | Array of String | 选择框的选项列表（仅SELECT类型） |
| ComponentPage | Integer | 控件所在页码 |
| ComponentPosX | Float | 控件X坐标 |
| ComponentPosY | Float | 控件Y坐标 |
| ComponentWidth | Float | 控件宽度 |
| ComponentHeight | Float | 控件高度 |

### Recipient 结构说明

| 参数名称 | 类型 | 描述 |
|---------|------|------|
| RecipientId | String | 参与方ID |
| RecipientType | Integer | 参与方类型：<br/>0：企业签署方<br/>1：个人签署方 |
| RoleName | String | 角色名称 |
| RoutingOrder | Integer | 签署顺序 |

---

## 4. 请求示例

### 示例1：指定模板ID查询模板信息

#### 输入示例

```json
POST / HTTP/1.1
Host: ess.tencentcloudapi.com
Content-Type: application/json
X-TC-Action: DescribeFlowTemplates
<公共请求参数>

{
    "Operator": {
        "UserId": "yDxVwUyKQWho8CUuO4zjEyQOAgwvr4Zy"
    },
    "Offset": 0,
    "Limit": 20,
    "ApplicationId": "",
    "Filters": [
        {
            "Key": "template-id",
            "Values": [
                "yDRS4UUgygqdcjjhUuO4zjEBpXdcsHWX"
            ]
        }
    ]
}
```

#### 输出示例

```json
{
    "Response": {
        "RequestId": "s1695125479063466836",
        "Templates": [
            {
                "CreatedOn": 1693900800,
                "Promoter": {
                    "OrganizationId": "",
                    "OrganizationName": "",
                    "RecipientId": "yDxZzUyKQDKuihUuO4zjEy09jfapyHjn",
                    "RecipientType": 1,
                    "RequireSign": false,
                    "RequireValidation": false,
                    "RoleName": "甲方",
                    "RoutingOrder": 1,
                    "UserId": ""
                },
                "Recipients": [
                    {
                        "OrganizationId": "",
                        "OrganizationName": "",
                        "RecipientId": "yDxZzUyKQDKuihUuO4zjEy09jfapyHjn",
                        "RecipientType": 1,
                        "RequireSign": false,
                        "RequireValidation": false,
                        "RoleName": "乙方",
                        "RoutingOrder": 2,
                        "UserId": ""
                    }
                ],
                "Components": [
                    {
                        "ComponentId": "ComponentId_1",
                        "ComponentName": "姓名",
                        "ComponentType": "TEXT",
                        "ComponentRequired": true,
                        "ComponentRecipientId": "yDxZzUyKQDKuihUuO4zjEy09jfapyHjn",
                        "Placeholder": "请输入姓名"
                    }
                ],
                "SignComponents": [
                    {
                        "ComponentId": "ComponentId_4",
                        "ComponentName": "个人签名/印章",
                        "ComponentType": "SIGN_SIGNATURE",
                        "ComponentRequired": true,
                        "ComponentRecipientId": "yDxZzUyKQDKuihUuO4zjEy09jfapyHjn"
                    }
                ],
                "TemplateId": "yDRS4UUgygqdcjjhUuO4zjEBpXdcsHWX",
                "TemplateName": "测试模板",
                "TemplateType": 0,
                "TemplateVersion": "20230906002"
            }
        ],
        "TotalCount": 1
    }
}
```

### 示例2：通过不存在的模板ID查询模板信息

#### 输入示例

```json
POST / HTTP/1.1
Host: ess.tencentcloudapi.com
Content-Type: application/json
X-TC-Action: DescribeFlowTemplates
<公共请求参数>

{
    "Operator": {
        "UserId": "yDxVwUyKQWho8CUuO4zjEyQOAgwvr4Zy"
    },
    "Offset": 0,
    "Limit": 20,
    "ApplicationId": "",
    "Filters": [
        {
            "Key": "template-id",
            "Values": [
                "yDRS4UUgygqdcjjhUuO4zjEBpXdcsHWw"
            ]
        }
    ]
}
```

#### 输出示例

```json
{
    "Response": {
        "RequestId": "s1695125479063466836",
        "Templates": [],
        "TotalCount": 0
    }
}
```

---

## 5. 错误码

以下仅列出了接口业务逻辑相关的错误码，其他错误码详见[公共错误码](https://qian.tencent.com/developers/companyApis/apiGuides/errorCodes)。

| 错误码 | 描述 |
|--------|------|
| FailedOperation | 操作失败 |
| FailedOperation.NotFoundShadowUser | 未找到集团子企业相关用户信息，请检查用户相关参数 |
| InternalError | 内部错误 |
| InternalError.Db | 数据库异常 |
| InternalError.DependsApi | 依赖的第三方API返回错误 |
| InternalError.DependsDb | 数据库执行错误 |
| InternalError.System | 系统错误，请稍后重试 |
| InvalidParameter | 参数错误 |
| InvalidParameter.ContentType | 不合法的模板查询类型，请检查后重试 |
| InvalidParameter.ParamError | 参数错误 |
| InvalidParameterValue | 参数取值错误 |
| MissingParameter | 缺少参数错误 |
| MissingParameter.UserId | 缺少用户id，请检查后重试 |
| OperationDenied | 操作被拒绝 |
| OperationDenied.ErrNoResourceAccess | 此企业无该资源使用权限 |
| OperationDenied.Forbid | 禁止此项操作 |
| OperationDenied.NoIdentityVerify | 未通过个人实名认证 |
| OperationDenied.SubOrgNotJoin | 子企业暂未加入 |
| ResourceNotFound.Application | 应用号不存在或已删除 |
| ResourceNotFound.Template | 模板不存在，请检查模板参数，模板配置，并稍后重试 |
| ResourceUnavailable | 资源不可用 |
| UnauthorizedOperation | 未授权操作 |
| UnauthorizedOperation.NoPermissionFeature | 请升级到对应版本后即可使用该接口 |
| UnknownParameter | 未知参数错误 |

---

## 6. 使用说明

### 6.1 查询所有模板

不指定 `Filters` 参数，可以查询所有模板：

```json
{
    "Operator": {
        "UserId": "yDxVwUyKQWho8CUuO4zjEyQOAgwvr4Zy"
    },
    "Offset": 0,
    "Limit": 20
}
```

### 6.2 通过模板名称查询

```json
{
    "Operator": {
        "UserId": "yDxVwUyKQWho8CUuO4zjEyQOAgwvr4Zy"
    },
    "Filters": [
        {
            "Key": "template-name",
            "Values": ["测试模板"]
        }
    ]
}
```

### 6.3 提取填写控件

从返回的模板信息中，可以通过筛选 `Components` 数组来获取需要填写的控件：

- **填写控件类型**：`TEXT`、`MULTI_LINE_TEXT`、`DATE`、`SELECT`
- **签署控件类型**：`SIGN_SIGNATURE`、`SIGN_SEAL`、`SIGN_DATE`

在创建电子文档时，需要为填写控件提供 `FormFields` 参数：

```json
{
    "FlowId": "xxx",
    "TemplateId": "xxx",
    "FormFields": [
        {
            "ComponentId": "ComponentId_1",
            "ComponentValue": "张三"
        },
        {
            "ComponentName": "姓名",
            "ComponentValue": "李四"
        }
    ]
}
```

**注意**：`ComponentId` 和 `ComponentName` 二选一即可。

---

## 7. 相关链接

- [腾讯电子签开发者文档](https://qian.tencent.com/developers/companyApis/templatesAndFiles/DescribeFlowTemplates)
- [公共请求参数](https://qian.tencent.com/developers/companyApis/apiGuides/commonParams)
- [公共错误码](https://qian.tencent.com/developers/companyApis/apiGuides/errorCodes)
- [创建电子文档接口](https://qian.tencent.com/developers/companyApis/createFlows/CreateDocument)

---

*文档来源：[腾讯电子签开发者文档](https://qian.tencent.com/developers/companyApis/templatesAndFiles/DescribeFlowTemplates)*

